// Accueil client : les offres personnalisées mises en avant (offre à la une,
// cartes, escalier des paliers) — maquette validée le 21/10/2026.
// Fonctions pures, testées dans src/__tests__/offerShowcase.test.ts.
//
// Même base de prix que la page « Mes offres » (CustomerProductCard) : prix du
// premier palier (ou prix au m²), remise Premium selon isPremiumDiscountEligible,
// économie calculée par getCatalogSavingsPercent.
import dayjs from 'dayjs';
import type { Product } from '@/@types/product';
import type { Customer } from '@/@types/customer';
import type { StrapiImage } from '@/utils/strapiImage';
import {
  applyPremiumDiscount,
  getCatalogSavingsPercent,
  getProductBasePrice,
} from '@/utils/productHelpers';
import { fmtPrice } from '@/utils/priceHelpers';

/** Une offre créée depuis moins de NEW_OFFER_DAYS jours porte l'étiquette « Nouveau ». */
export const NEW_OFFER_DAYS = 30;
/** Marches au plus dans l'escalier des paliers */
export const MAX_STEPS = 4;
/** Offres au plus dans l'offre à la une */
export const MAX_FEATURED = 6;
/**
 * Offres chargées et affichées par l'accueil (trois rangées de quatre). Avant :
 * 10 chargées, 8 affichées — la 9ᵉ offre d'ESDL DOUVAINE (sa bâche, produit
 * plus ancien donc rangé après les nouveautés) n'apparaissait pas (23/10/2026).
 */
export const HOME_OFFERS = 12;

/**
 * Fonds « studio » des visuels, en alternance. Très clairs : la photo est posée
 * en `mix-blend-mode: multiply`, son fond blanc prend la teinte sans colorer
 * le produit.
 */
export const OFFER_TILES = ['#f1efff', '#fff1e8', '#fff6d8', '#ffedf2', '#eaf1ff', '#e7f6ee'];

export type OfferStep = {
  key: string;
  /** « dès 50 » */
  quantity: string;
  /** « 19,90 € » (HT) */
  price: string;
  /** Hauteur de la marche, en % de la plus haute */
  height: number;
  /** Le palier le moins cher */
  best: boolean;
};

export type OfferShowcaseItem = {
  documentId: string;
  name: string;
  image?: StrapiImage;
  tile: string;
  category?: { id: string; name: string };
  /** Prix affiché en grand, sans unité : « 19,90 € » */
  price: string;
  /** « HT l'unité », « HT le m² », « HT le pack de 50 » */
  unit: string;
  /** Prix catalogue barré, seulement quand l'offre fait économiser */
  catalogue?: string;
  /** Économie en % par rapport au prix catalogue */
  savings: number | null;
  isNew: boolean;
  /** Escalier des paliers : prix à l'unité qui baisse avec la quantité */
  steps: OfferStep[];
  /** Phrase à la place de l'escalier (prix au m², vente par packs) */
  note?: string;
};

const qty = (n: number) => n.toLocaleString('fr-FR');

const sortedTiers = (product: Product) =>
  [...(product.priceTiers ?? [])]
    .filter((t) => Number.isFinite(t?.price) && Number.isFinite(t?.minQuantity))
    .sort((a, b) => a.minQuantity - b.minQuantity);

/**
 * Escalier des paliers (mode « tiers » seulement : en packs, le prix est celui
 * du pack entier et monte avec la quantité). Vide si le prix ne baisse pas avec
 * la quantité. Au-delà de MAX_STEPS paliers : les premiers et le dernier.
 */
export function offerSteps(
  product: Product,
  customer?: Customer | null
): OfferStep[] {
  if (product.pricingMode === 'm2' || product.pricingMode === 'packs') return [];
  const tiers = sortedTiers(product);
  if (tiers.length < 2) return [];
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].price > tiers[i - 1].price) return [];
  }
  if (tiers[tiers.length - 1].price >= tiers[0].price) return [];
  const shown =
    tiers.length > MAX_STEPS
      ? [...tiers.slice(0, MAX_STEPS - 1), tiers[tiers.length - 1]]
      : tiers;
  const last = shown.length - 1;
  return shown.map((t, i) => ({
    key: String(t.minQuantity),
    quantity: `dès ${qty(Math.max(1, t.minQuantity))}`,
    price: fmtPrice(applyPremiumDiscount(t.price, customer, product)),
    height: Math.round(100 - (i * 60) / last),
    best: i === last,
  }));
}

export function isNewOffer(
  createdAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!createdAt) return false;
  const created = dayjs(createdAt);
  if (!created.isValid()) return false;
  const age = dayjs(now).diff(created, 'day', true);
  return age >= 0 && age < NEW_OFFER_DAYS;
}

export function toShowcaseItem(
  product: Product,
  customer: Customer | null | undefined,
  index: number,
  now: Date = new Date()
): OfferShowcaseItem {
  const m2 = product.pricingMode === 'm2';
  const packs = product.pricingMode === 'packs';
  const base = m2 ? product.pricePerM2 || 0 : getProductBasePrice(product);
  // Au m², le prix catalogue n'a pas d'équivalent fiable (et un produit au m²
  // sans palier donnait « −100 % ») : pas d'autocollant.
  const savings = !m2 && base > 0 ? getCatalogSavingsPercent(product) : null;
  const firstPack = product.priceTiers?.[0];
  const packSizes = [...new Set(sortedTiers(product).map((t) => t.minQuantity))];
  return {
    documentId: product.documentId,
    name: product.name,
    image: product.images?.[0],
    tile: OFFER_TILES[index % OFFER_TILES.length],
    category: product.productCategory
      ? { id: product.productCategory.documentId, name: product.productCategory.name }
      : undefined,
    price: fmtPrice(applyPremiumDiscount(base, customer, product)),
    unit: m2
      ? 'HT le m²'
      : packs && firstPack
        ? `HT le pack de ${qty(firstPack.minQuantity)}`
        : "HT l'unité",
    catalogue: savings && product.catalogPrice ? fmtPrice(product.catalogPrice) : undefined,
    savings,
    isNew: isNewOffer(product.createdAt, now),
    steps: offerSteps(product, customer),
    note: m2
      ? 'Prix au m² : indiquez vos dimensions sur la fiche, le total se calcule tout seul.'
      : packs && packSizes.length > 1
        ? `Vendu par packs de ${packSizes.map(qty).join(', ')} pièces.`
        : undefined,
  };
}

/** Les offres du client prêtes à afficher, les nouvelles d'abord (ordre stable). */
export function buildOfferShowcase(
  products: Product[],
  customer: Customer | null | undefined,
  now: Date = new Date()
): OfferShowcaseItem[] {
  const items = products.map((p, i) => toShowcaseItem(p, customer, i, now));
  return [...items.filter((o) => o.isNew), ...items.filter((o) => !o.isNew)];
}

/** Filtres par catégorie : seulement quand les offres en couvrent au moins deux. */
export function offerCategories(
  offers: OfferShowcaseItem[]
): { id: string; name: string; count: number }[] {
  const byId = new Map<string, { id: string; name: string; count: number }>();
  offers.forEach((o) => {
    if (!o.category) return;
    const c = byId.get(o.category.id);
    if (c) c.count += 1;
    else byId.set(o.category.id, { ...o.category, count: 1 });
  });
  return byId.size >= 2 ? [...byId.values()] : [];
}

/** Jours avant la livraison prévue ; null sans date ou une fois la date passée. */
export function daysUntil(
  date: Date | string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!date) return null;
  const d = dayjs(date);
  if (!d.isValid()) return null;
  const days = d.startOf('day').diff(dayjs(now).startOf('day'), 'day');
  return days >= 0 ? days : null;
}
