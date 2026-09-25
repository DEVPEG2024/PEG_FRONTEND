import { Product, SizeAndColorSelection } from '@/@types/product';
import { Customer } from '@/@types/customer';

/**
 * Remise automatique des clients Premium sur le CATALOGUE PUBLIC (-15 %).
 * Source unique de vérité côté front.
 */
export const PREMIUM_DISCOUNT_RATE = 0.15;

/** Drapeau du catalogue public — peut manquer selon la requête qui a lu le produit */
type CatalogueFlag = { inCatalogue?: boolean | null };

/**
 * La remise Premium ne vaut que pour le catalogue public (demande Nova du
 * 25/09/2026) : une offre préparée pour un client — produit hors catalogue,
 * réservé à lui ou à son secteur (« Mes offres ») — garde son prix, c'est déjà
 * un tarif négocié. En prod, tous les produits réservés sont hors catalogue.
 * Champ absent (requête du catalogue, ancien panier) : traité comme catalogue.
 * ⚠️ Miroir de `services/premium-pricing.ts` côté serveur (prix au paiement,
 * offres du chatbot) : garder les deux alignés.
 */
export function isPremiumDiscountEligible(
  product?: CatalogueFlag | null
): boolean {
  return product?.inCatalogue !== false;
}

export function getPremiumMultiplier(
  customer: Customer | null | undefined,
  product: CatalogueFlag | null | undefined
): number {
  return customer?.premium && isPremiumDiscountEligible(product)
    ? 1 - PREMIUM_DISCOUNT_RATE
    : 1;
}

/** Jusqu'à cette date, les offres préparées recevaient aussi la remise Premium. */
export const PREMIUM_OFFERS_EXCLUDED_SINCE = '2026-09-26';

/**
 * Économie Premium d'une facture (HT) : ce que la remise a réellement évité,
 * ligne par ligne — produits du catalogue public, et offres facturées avant
 * PREMIUM_OFFERS_EXCLUDED_SINCE. Une facture sans ligne de commande (devis,
 * projet) n'a jamais eu de remise Premium : 0. Le prix d'une ligne est déjà
 * remisé → économie = prix × taux / (1 − taux).
 */
export function premiumSavingsHT(invoice: {
  date?: string | Date | null;
  orderItems?:
    | { price?: number | null; product?: CatalogueFlag | null }[]
    | null;
}): number {
  const issued = invoice.date ? new Date(invoice.date) : null;
  const before =
    !!issued &&
    !Number.isNaN(issued.getTime()) &&
    issued < new Date(PREMIUM_OFFERS_EXCLUDED_SINCE);
  const discounted = (invoice.orderItems ?? []).reduce(
    (sum, item) =>
      before || isPremiumDiscountEligible(item.product)
        ? sum + (Number(item.price) || 0)
        : sum,
    0
  );
  return (discounted * PREMIUM_DISCOUNT_RATE) / (1 - PREMIUM_DISCOUNT_RATE);
}

/**
 * Applique la remise Premium (-15 %) à un prix si le client est Premium et
 * que le produit est au catalogue public. Arrondi au centime. Le produit est
 * OBLIGATOIRE : aucun écran ne peut oublier la règle des offres.
 */
export function applyPremiumDiscount(
  price: number,
  customer: Customer | null | undefined,
  product: CatalogueFlag | null | undefined
): number {
  return (
    Math.round(price * getPremiumMultiplier(customer, product) * 100) / 100
  );
}

/**
 * Get the effective price for a product.
 *
 * The application historically stored a simple `price` property on the
 * `Product` object.  To support volume pricing we introduced `priceTiers`
 * which is an array of `{minQuantity, price}` entries.  In practice the
 * first tier corresponds to the base price so we treat that as the
 * canonical number when rendering the UI.
 *
 * This helper centralises the logic so that the rest of the codebase can
 * continue calling it and not worry about whether the product has a
 * legacy `price` value or a more modern `priceTiers` list.
 *
 * If neither field is defined the function returns 0.
 */
export function getProductBasePrice(product: Product): number {
  if (product.priceTiers && product.priceTiers.length > 0) {
    return product.priceTiers[0].price;
  }

  // `price` is kept around for compatibility with the backend schema;
  // when the API is updated this can eventually be removed.
  return product.price || 0;
}

/**
 * Prix de revient (coût) HT d'un produit. Référence interne admin.
 * Retourne 0 si non renseigné.
 */
export function getProductCost(product?: Product | null): number {
  return product?.cost != null ? product.cost : 0;
}

/**
 * Raisons pour lesquelles un produit est INVISIBLE dans le catalogue client.
 * La page catégorie client filtre : productCategory = catégorie exacte
 * + active: true + inCatalogue: true — et la liste des catégories masque
 * celles qui sont inactives. Un produit qui rate une seule de ces conditions
 * n'apparaît nulle part côté client, sans que rien ne le signale à l'admin.
 * Retourne [] si le produit est visible.
 */
export function getCatalogueVisibilityIssues(product: Product): string[] {
  const issues: string[] = [];
  if (!product.active) issues.push('Produit inactif');
  if (!product.inCatalogue) issues.push('Hors catalogue');
  if (!product.productCategory) {
    issues.push('Aucune catégorie rattachée');
  } else if ((product.productCategory as { active?: boolean }).active === false) {
    issues.push(`Catégorie « ${product.productCategory.name} » inactive`);
  }
  return issues;
}

/** Marge unitaire en € : prix de vente − prix de revient. Arrondie au centime. */
export function getUnitMargin(sellPrice: number, cost: number): number {
  return Math.round((sellPrice - cost) * 100) / 100;
}

/**
 * Taux de marge en % calculé sur le prix de vente : (vente − coût) / vente × 100.
 * Retourne null si le prix de vente est nul/absent (taux non défini).
 */
export function getMarginRate(sellPrice: number, cost: number): number | null {
  if (!sellPrice || sellPrice <= 0) return null;
  return Math.round(((sellPrice - cost) / sellPrice) * 100);
}

export function getProductPriceForQuantity(
  product: Product,
  quantity: number
): number {
  if (product.priceTiers && product.priceTiers.length > 0) {
    // Find the most appropriate price tier for the given quantity
    const applicableTier = [...product.priceTiers]
      .sort((a, b) => b.minQuantity - a.minQuantity) // Sort tiers in descending order
      .find((tier) => quantity >= tier.minQuantity); // Find the first tier that applies

    if (applicableTier) {
      return applicableTier.price;
    }
  }

  // Fallback to base price if no tiers apply
  return getProductBasePrice(product);
}

export function getProductPriceForSizeAndColors(
  product: Product,
  sizeAndColors: SizeAndColorSelection[]
): number {
  const totalQuantity = sizeAndColors.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );

  return getProductPriceForQuantity(product, totalQuantity);
}

export function getProductPackOptions(product: Product): number[] {
  if (!product.priceTiers || product.priceTiers.length === 0) return [];

  return [...new Set(product.priceTiers.map((tier) => tier.minQuantity))].sort(
    (a, b) => a - b
  );
}

export function isProductPackPricing(product: Product): boolean {
  return product.pricingMode === 'packs';
}

export function isProductM2Pricing(product: Product): boolean {
  return product.pricingMode === 'm2';
}

/**
 * Calculate price for m² pricing: width × height × pricePerM2 × quantity
 * Enforces minM2 if set.
 */
export function getM2Price(
  product: Product,
  width: number,
  height: number,
  quantity: number = 1
): { area: number; pricePerUnit: number; total: number } {
  const area = Math.max(width * height, product.minM2 || 0);
  const pricePerUnit = area * (product.pricePerM2 || 0);
  return { area, pricePerUnit, total: pricePerUnit * quantity };
}

/**
 * Compute the savings percentage compared to the public catalog price.
 * Returns null when no catalog price is set or when there is no saving.
 */
export function getCatalogSavingsPercent(
  product: Product,
  quantity: number = 1
): number | null {
  if (!product.catalogPrice || product.catalogPrice <= 0) return null;
  const currentPrice = getProductPriceForQuantity(product, quantity);
  if (currentPrice >= product.catalogPrice) return null;
  return Math.round(
    ((product.catalogPrice - currentPrice) / product.catalogPrice) * 100
  );
}

export function getTotalPriceForCartItem(
  product: Product,
  sizeAndColors: SizeAndColorSelection[]
): number {
  // m² pricing: sum area × pricePerM2 × quantity for each selection
  if (isProductM2Pricing(product)) {
    return sizeAndColors.reduce((total, sel) => {
      const w = sel.width || 0;
      const h = sel.height || 0;
      const { total: lineTotal } = getM2Price(product, w, h, sel.quantity);
      return total + lineTotal;
    }, 0);
  }

  const totalQuantity = sizeAndColors.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );
  const packPrice = getProductPriceForQuantity(product, totalQuantity);

  // In pack mode, the price IS the total (pack price, not per-unit)
  if (isProductPackPricing(product)) {
    return packPrice;
  }
  return packPrice * totalQuantity;
}
