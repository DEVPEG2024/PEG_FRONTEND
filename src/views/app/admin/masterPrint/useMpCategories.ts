/*
 * Catégories du catalogue Master Print (ajout 21/11/2026) : libellés à jour,
 * nombre de produits, et catégorie PEG retenue pour chaque catégorie Master
 * Print (rangement automatique à l'import). Lues une fois par session (le
 * serveur les garde 24 h) ; à défaut, la liste connue (MP_CATEGORY_LABELS).
 * Backend : peg_strapi `master-print-categories.service.ts`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MpCategoriesResponse } from '@/@types/masterPrintQuote';
import { apiGetMasterPrintCategories } from '@/services/MasterPrintQuoteServices';
import { MP_CATEGORY_LABELS } from '@/utils/masterPrint';
import { categoryEntries, categoryLabel } from '@/utils/masterPrintQuote';

let cached: MpCategoriesResponse | null = null;
let inflight: Promise<MpCategoriesResponse | null> | null = null;
const listeners = new Set<(r: MpCategoriesResponse) => void>();

const load = (): Promise<MpCategoriesResponse | null> => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = apiGetMasterPrintCategories()
      .then(({ data }) => {
        cached = {
          categories: data.categories || [],
          pegCategories: data.pegCategories || {},
        };
        return cached;
      })
      .catch(() => null) // liste connue en attendant
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

const useMpCategories = () => {
  const [data, setData] = useState<MpCategoriesResponse | null>(cached);

  useEffect(() => {
    let alive = true;
    const on = (r: MpCategoriesResponse) => {
      if (alive) setData(r);
    };
    listeners.add(on);
    load().then((r) => {
      if (r) on(r);
    });
    return () => {
      alive = false;
      listeners.delete(on);
    };
  }, []);

  /** Code Master Print → libellé, dans l'ordre de Master Print (pastilles du filtre). */
  const labels = useMemo(
    () =>
      Object.fromEntries(
        categoryEntries(data?.categories, MP_CATEGORY_LABELS).map((c) => [
          c.code,
          c.label,
        ])
      ) as Record<string, string>,
    [data]
  );
  const labelOf = useCallback(
    (code: string) => categoryLabel(data?.categories, code, MP_CATEGORY_LABELS),
    [data]
  );
  const rememberedFor = useCallback(
    (code: string): string | undefined => data?.pegCategories[code],
    [data]
  );

  /** Après un import : la même catégorie PEG sera proposée (le serveur l'a retenue aussi). */
  const remember = useCallback((mpCode: string, pegDocumentId: string) => {
    if (!cached || !mpCode || !pegDocumentId) return;
    cached = {
      ...cached,
      pegCategories: { ...cached.pegCategories, [mpCode]: pegDocumentId },
    };
    const next = cached;
    listeners.forEach((l) => l(next));
  }, []);

  return { labels, labelOf, rememberedFor, remember };
};

export default useMpCategories;
