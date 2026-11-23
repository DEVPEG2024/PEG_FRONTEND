/**
 * Catalogue Master Print en cartes « comme une offre » (22/11/2026) — règles
 * pures, testées : src/__tests__/masterPrintCards.test.ts. Composant :
 * views/app/admin/masterPrint/catalog/CatalogProductCard.tsx.
 */
import type { MpCatalogResult } from '@/@types/masterPrint';
import type { PegCardProduct } from '@/services/MasterPrintCardsServices';

/** Ce que la carte montre d'une fiche PEG déjà importée. */
export type PegCardInfo = {
  documentId: string;
  imageUrl: string | null;
  /** Plus petit prix de vente HT des paliers (« dès … »), sinon le prix de base. */
  priceFrom: number | null;
  /** Prix de vente du premier palier (quantité minimale). */
  basePrice: number | null;
  active: boolean;
  inCatalogue: boolean;
  imageCount: number;
  categoryName: string | null;
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v === null ||
    v === undefined ||
    v === '' ||
    !Number.isFinite(n) ||
    n <= 0
    ? null
    : n;
};

export function pegCardInfo(p: PegCardProduct): PegCardInfo {
  const tiers = (Array.isArray(p.priceTiers) ? p.priceTiers : [])
    .map((t) => ({ q: Number(t?.minQuantity) || 0, price: num(t?.price) }))
    .filter((t): t is { q: number; price: number } => t.price != null)
    .sort((a, b) => a.q - b.q);
  const base = tiers[0]?.price ?? num(p.price);
  const min = tiers.length ? Math.min(...tiers.map((t) => t.price)) : base;
  const img = Array.isArray(p.images) ? p.images[0] : null;
  const formats = img?.formats || null;
  return {
    documentId: p.documentId,
    imageUrl: formats?.small?.url || formats?.medium?.url || img?.url || null,
    priceFrom: min ?? null,
    basePrice: base ?? null,
    active: p.active !== false,
    inCatalogue: p.inCatalogue === true,
    imageCount: Array.isArray(p.images) ? p.images.length : 0,
    categoryName: p.productCategory?.name ?? null,
  };
}

/** Fiche PEG retenue pour la carte (la première importée). */
export const cardPegId = (
  r: Pick<MpCatalogResult, 'imported'>
): string | null => r.imported[0]?.documentId ?? null;

/** Identifiants des fiches PEG à lire (pas encore connues), par lots. */
export function idsToFetch(
  results: Array<Pick<MpCatalogResult, 'imported'>>,
  known: Set<string>,
  batch = 100
): string[][] {
  const ids = [
    ...new Set(
      results
        .map(cardPegId)
        .filter((id): id is string => !!id && !known.has(id))
    ),
  ];
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += batch) out.push(ids.slice(i, i + batch));
  return out;
}

/** Famille Master Print → illustration et encre de la carte (repli : impression). */
export const CATEGORY_LOOK: Record<
  string,
  {
    art: 'textile' | 'dtf' | 'banner' | 'sticker' | 'rollup' | 'print';
    ink: string;
  }
> = {
  textile: { art: 'textile', ink: '#7c6cf0' },
  dtf: { art: 'dtf', ink: '#e0559f' },
  'large-format': { art: 'banner', ink: '#1f9cc6' },
  stickers: { art: 'sticker', ink: '#c98500' },
  displays: { art: 'rollup', ink: '#199e70' },
};
export const lookOf = (category: string) =>
  CATEGORY_LOOK[category] ?? { art: 'print' as const, ink: '#9d92ff' };

/** « B&C · réf. TU01T ». */
export const cardMeta = (r: Pick<MpCatalogResult, 'brand' | 'sku'>) =>
  [r.brand, r.sku ? `réf. ${r.sku}` : null].filter(Boolean).join(' · ');

/** Badge des ventes : « N° 1 des ventes » jusqu'au 50e. */
export const rankBadge = (rank: number | null | undefined) =>
  rank && rank <= 50 ? `N° ${rank} des ventes` : null;
