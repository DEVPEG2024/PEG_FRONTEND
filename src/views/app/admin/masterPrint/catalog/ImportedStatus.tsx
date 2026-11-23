/*
 * Fiche du catalogue Master Print — état des fiches PEG déjà importées (23/11/2026) :
 * visible ou non des clients, photos, et de quoi corriger sur place (« Ajouter
 * les photos du modèle », « Rendre visible des clients »). Signale aussi un
 * modèle importé plusieurs fois.
 *
 * Origine : un t-shirt importé « n'apparaissait nulle part » — l'import crée la
 * fiche hors du catalogue client et sans photo (Master Print n'en donne pas).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiCheckCircle } from 'react-icons/hi';
import type { MpImportedRef } from '@/@types/masterPrint';
import type { Product } from '@/@types/product';
import { apiGetPegCardProducts } from '@/services/MasterPrintCardsServices';
import { apiUpdateProduct } from '@/services/ProductServices';
import { apiAttachModelPhotos } from '@/services/SupplierPhotosServices';
import { masterPrintError } from '@/utils/masterPrint';
import { type PegCardInfo, pegCardInfo } from '@/utils/masterPrintCards';
import {
  Btn,
  Pill,
  input,
  muted,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

const OK = {
  color: '#86efac',
  background: 'rgba(34,197,94,0.12)',
  border: 'rgba(34,197,94,0.35)',
};
const WARN = {
  color: '#fcd34d',
  background: 'rgba(245,158,11,0.12)',
  border: 'rgba(245,158,11,0.35)',
};

type Props = {
  refs: MpImportedRef[];
  categories: Array<{ documentId: string; name: string }>;
  /** Catégorie choisie dans le formulaire d'import (proposée pour rendre visible). */
  suggestedCategory: string;
  /** Le modèle a des photos dans le catalogue public. */
  canCopyPhotos: boolean;
};

const ImportedStatus = ({
  refs,
  categories,
  suggestedCategory,
  canCopyPhotos,
}: Props) => {
  const [info, setInfo] = useState<Record<string, PegCardInfo>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [cat, setCat] = useState<Record<string, string>>({});
  const ids = refs.map((r) => r.documentId).join(',');

  const load = useCallback(async () => {
    const list = ids ? ids.split(',') : [];
    if (!list.length) return;
    try {
      const { data } = await apiGetPegCardProducts(list);
      const next: Record<string, PegCardInfo> = {};
      for (const p of data?.data?.products || [])
        next[p.documentId] = pegCardInfo(p);
      setInfo(next);
    } catch {
      /* l'état reste inconnu : les liens suffisent */
    }
  }, [ids]);

  useEffect(() => {
    load();
  }, [load]);

  const addPhotos = async (documentId: string) => {
    setBusy(`photos-${documentId}`);
    try {
      const { data } = await apiAttachModelPhotos(documentId);
      toast.success(
        data.galleryKept
          ? `La fiche avait déjà ses photos : elles sont gardées, ${data.colorPhotos} photo(s) de coloris ajoutée(s) au formulaire client.`
          : `${data.imageCount} photo(s) du modèle ajoutée(s) à la fiche${data.colorPhotos ? `, dont ${data.colorPhotos} par coloris` : ''}.`
      );
      await load();
    } catch (e) {
      toast.error(
        masterPrintError(e, 'Photos du modèle impossibles à copier.')
      );
    } finally {
      setBusy(null);
    }
  };

  const publish = async (documentId: string, hasCategory: boolean) => {
    const category = cat[documentId] ?? suggestedCategory;
    if (!hasCategory && !category) {
      toast.error(
        'Choisissez d’abord une catégorie : sans elle, le catalogue client ne montre pas le produit.'
      );
      return;
    }
    setBusy(`publish-${documentId}`);
    try {
      await apiUpdateProduct({
        documentId,
        inCatalogue: true,
        ...(!hasCategory ? { productCategory: category } : {}),
      } as unknown as Partial<Product>);
      toast.success('Le produit est visible dans le catalogue client.');
      await load();
    } catch (e) {
      toast.error(masterPrintError(e, 'Mise au catalogue impossible.'));
    } finally {
      setBusy(null);
    }
  };

  if (!refs.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '10px',
      }}
      data-testid="mp-imported-status"
    >
      {refs.length > 1 && (
        <p style={{ ...muted, color: WARN.color }}>
          Ce modèle est dans PEG {refs.length} fois. Gardez une fiche et
          supprimez les autres dans Boutique, Produits.
        </p>
      )}
      {refs.map((r) => {
        const i = info[r.documentId];
        const hasCategory = !!i?.categoryName;
        return (
          <div
            key={r.documentId}
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                color: '#86efac',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                margin: 0,
              }}
            >
              <HiCheckCircle aria-hidden="true" /> Dans PEG :
              <Link
                to={`/admin/products/edit/${r.documentId}`}
                style={{ color: '#86efac', textDecoration: 'underline' }}
              >
                {r.name}
              </Link>
              <Link
                to={`/admin/master-print/offers/${r.documentId}`}
                style={{ color: '#b9b0ff', textDecoration: 'underline' }}
              >
                formulaire client
              </Link>
            </p>
            {i && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <Pill
                  tone={i.inCatalogue && i.active && hasCategory ? OK : WARN}
                >
                  {i.inCatalogue && i.active && hasCategory
                    ? `Visible des clients${i.categoryName ? `, ${i.categoryName}` : ''}`
                    : !i.active
                      ? 'Fiche inactive'
                      : 'Pas encore visible des clients'}
                </Pill>
                <Pill tone={i.imageCount ? OK : WARN}>
                  {i.imageCount
                    ? `${i.imageCount} photo${i.imageCount > 1 ? 's' : ''}`
                    : 'Sans photo'}
                </Pill>
              </div>
            )}
            {i && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {canCopyPhotos && (
                  <Btn
                    onClick={() => addPhotos(r.documentId)}
                    disabled={!!busy}
                  >
                    {busy === `photos-${r.documentId}`
                      ? 'Copie des photos…'
                      : i.imageCount
                        ? 'Reprendre les photos du modèle'
                        : 'Ajouter les photos du modèle'}
                  </Btn>
                )}
                {(!i.inCatalogue || !hasCategory) && i.active && (
                  <>
                    {!hasCategory && (
                      <select
                        style={{ ...input, width: 'auto', minWidth: '180px' }}
                        value={cat[r.documentId] ?? suggestedCategory}
                        onChange={(e) =>
                          setCat((c) => ({
                            ...c,
                            [r.documentId]: e.target.value,
                          }))
                        }
                        aria-label="Catégorie du catalogue client"
                      >
                        <option value="">Choisir une catégorie…</option>
                        {categories.map((c) => (
                          <option key={c.documentId} value={c.documentId}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <Btn
                      variant="primary"
                      onClick={() => publish(r.documentId, hasCategory)}
                      disabled={!!busy}
                    >
                      {busy === `publish-${r.documentId}`
                        ? 'Mise au catalogue…'
                        : 'Rendre visible des clients'}
                    </Btn>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ImportedStatus;
