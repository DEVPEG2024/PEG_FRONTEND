/**
 * Tests unitaires — logique produit / tarification.
 * Couvre la remise Premium (−15 %), le prix de base, les paliers de quantité,
 * la tarification packs / m², la visibilité catalogue et les marges.
 *
 * Ce sont des fonctions pures : aucun mock nécessaire.
 */

import {
  PREMIUM_DISCOUNT_RATE,
  getPremiumMultiplier,
  applyPremiumDiscount,
  getProductBasePrice,
  getProductCost,
  getCatalogueVisibilityIssues,
  getUnitMargin,
  getMarginRate,
  getProductPriceForQuantity,
  getProductPriceForSizeAndColors,
  getProductPackOptions,
  isProductPackPricing,
  isProductM2Pricing,
  getM2Price,
  getCatalogSavingsPercent,
  getTotalPriceForCartItem,
} from '@/utils/productHelpers';
import { Product, SizeAndColorSelection } from '@/@types/product';
import { Customer } from '@/@types/customer';

// Fabriques minimales : on ne renseigne que les champs utilisés par les helpers.
const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({ price: 100, ...overrides } as Product);
const makeCustomer = (premium: boolean): Customer =>
  ({ premium } as Customer);
const sel = (
  quantity: number,
  extra: Partial<SizeAndColorSelection> = {}
): SizeAndColorSelection => ({ quantity, ...extra } as SizeAndColorSelection);

describe('Remise Premium', () => {
  test('le taux de remise est bien 15 %', () => {
    expect(PREMIUM_DISCOUNT_RATE).toBe(0.15);
  });

  test('multiplicateur = 0.85 pour un client Premium', () => {
    expect(getPremiumMultiplier(makeCustomer(true))).toBe(0.85);
  });

  test('multiplicateur = 1 pour un client standard', () => {
    expect(getPremiumMultiplier(makeCustomer(false))).toBe(1);
  });

  test('multiplicateur = 1 sans client (null/undefined)', () => {
    expect(getPremiumMultiplier(null)).toBe(1);
    expect(getPremiumMultiplier(undefined)).toBe(1);
  });

  test('applique −15 % et arrondit au centime', () => {
    expect(applyPremiumDiscount(100, makeCustomer(true))).toBe(85);
    // 33.33 × 0.85 = 28.3305 → 28.33
    expect(applyPremiumDiscount(33.33, makeCustomer(true))).toBe(28.33);
  });

  test('ne modifie pas le prix pour un client standard', () => {
    expect(applyPremiumDiscount(100, makeCustomer(false))).toBe(100);
  });
});

describe('Prix de base et coût', () => {
  test('retourne product.price en l\'absence de paliers', () => {
    expect(getProductBasePrice(makeProduct({ price: 42 }))).toBe(42);
  });

  test('retourne 0 si aucun prix', () => {
    expect(getProductBasePrice(makeProduct({ price: undefined }))).toBe(0);
  });

  test('privilégie le premier palier de prix si présent', () => {
    const p = makeProduct({
      price: 100,
      priceTiers: [
        { minQuantity: 1, price: 90 },
        { minQuantity: 10, price: 80 },
      ],
    });
    expect(getProductBasePrice(p)).toBe(90);
  });

  test('coût produit : valeur ou 0 par défaut', () => {
    expect(getProductCost(makeProduct({ cost: 12.5 }))).toBe(12.5);
    expect(getProductCost(makeProduct({ cost: undefined }))).toBe(0);
    expect(getProductCost(null)).toBe(0);
    expect(getProductCost(makeProduct({ cost: 0 }))).toBe(0);
  });
});

describe('Paliers de quantité', () => {
  const tiered = makeProduct({
    price: 100,
    priceTiers: [
      { minQuantity: 1, price: 100 },
      { minQuantity: 10, price: 80 },
      { minQuantity: 50, price: 60 },
    ],
  });

  test('choisit le palier applicable le plus élevé', () => {
    expect(getProductPriceForQuantity(tiered, 1)).toBe(100);
    expect(getProductPriceForQuantity(tiered, 9)).toBe(100);
    expect(getProductPriceForQuantity(tiered, 10)).toBe(80);
    expect(getProductPriceForQuantity(tiered, 49)).toBe(80);
    expect(getProductPriceForQuantity(tiered, 50)).toBe(60);
    expect(getProductPriceForQuantity(tiered, 1000)).toBe(60);
  });

  test('sous le premier palier → prix de base (= 1er palier quand des paliers existent)', () => {
    // getProductBasePrice retourne priceTiers[0].price dès qu'un palier existe,
    // indépendamment de sa minQuantity → fallback à 70, pas au champ price legacy.
    const p = makeProduct({ price: 100, priceTiers: [{ minQuantity: 5, price: 70 }] });
    expect(getProductPriceForQuantity(p, 1)).toBe(70);
  });

  test('somme les quantités des tailles/couleurs pour choisir le palier', () => {
    const price = getProductPriceForSizeAndColors(tiered, [sel(6), sel(6)]);
    expect(price).toBe(80); // total 12 ≥ 10
  });

  test('options de packs = minQuantity uniques triées', () => {
    expect(getProductPackOptions(tiered)).toEqual([1, 10, 50]);
    expect(getProductPackOptions(makeProduct({ priceTiers: [] }))).toEqual([]);
  });
});

describe('Modes de tarification', () => {
  test('détecte le mode packs', () => {
    expect(isProductPackPricing(makeProduct({ pricingMode: 'packs' }))).toBe(true);
    expect(isProductPackPricing(makeProduct({ pricingMode: 'm2' }))).toBe(false);
  });

  test('détecte le mode m²', () => {
    expect(isProductM2Pricing(makeProduct({ pricingMode: 'm2' }))).toBe(true);
    expect(isProductM2Pricing(makeProduct({ pricingMode: 'packs' }))).toBe(false);
  });

  test('prix m² = surface × prix/m² × quantité, avec surface mini', () => {
    const p = makeProduct({ pricePerM2: 20, minM2: 0.5 });
    // 1 × 2 = 2 m² × 20 € × 3 = 120
    expect(getM2Price(p, 1, 2, 3)).toEqual({ area: 2, pricePerUnit: 40, total: 120 });
    // 0.1 × 0.1 = 0.01 → forcé au mini 0.5 m² × 20 = 10
    expect(getM2Price(p, 0.1, 0.1, 1)).toEqual({ area: 0.5, pricePerUnit: 10, total: 10 });
  });
});

describe('Total panier', () => {
  test('mode standard : prix unitaire × quantité totale', () => {
    const p = makeProduct({ price: 25 });
    expect(getTotalPriceForCartItem(p, [sel(2), sel(3)])).toBe(125); // 25 × 5
  });

  test('mode packs : le prix du palier EST le total', () => {
    const p = makeProduct({
      pricingMode: 'packs',
      priceTiers: [
        { minQuantity: 10, price: 200 },
        { minQuantity: 20, price: 350 },
      ],
    });
    // total 20 → palier 350, pas ×20
    expect(getTotalPriceForCartItem(p, [sel(10), sel(10)])).toBe(350);
  });

  test('mode m² : somme des surfaces facturées', () => {
    const p = makeProduct({ pricingMode: 'm2', pricePerM2: 10 });
    // (1×1×10×2) + (2×1×10×1) = 20 + 20 = 40
    const total = getTotalPriceForCartItem(p, [
      sel(2, { width: 1, height: 1 }),
      sel(1, { width: 2, height: 1 }),
    ]);
    expect(total).toBe(40);
  });
});

describe('Marges', () => {
  test('marge unitaire = vente − coût, arrondie au centime', () => {
    expect(getUnitMargin(50, 30)).toBe(20);
    expect(getUnitMargin(99.999, 0)).toBe(100); // arrondi au centime supérieur
  });

  test('taux de marge en % sur le prix de vente', () => {
    expect(getMarginRate(100, 60)).toBe(40);
    expect(getMarginRate(80, 60)).toBe(25);
  });

  test('taux de marge indéfini si prix de vente nul', () => {
    expect(getMarginRate(0, 60)).toBeNull();
    expect(getMarginRate(-5, 60)).toBeNull();
  });
});

describe('Visibilité catalogue', () => {
  const visible = makeProduct({
    active: true,
    inCatalogue: true,
    productCategory: { name: 'Vêtements', active: true } as any,
  });

  test('aucun problème pour un produit visible', () => {
    expect(getCatalogueVisibilityIssues(visible)).toEqual([]);
  });

  test('signale produit inactif', () => {
    expect(getCatalogueVisibilityIssues({ ...visible, active: false })).toContain(
      'Produit inactif'
    );
  });

  test('signale hors catalogue', () => {
    expect(getCatalogueVisibilityIssues({ ...visible, inCatalogue: false })).toContain(
      'Hors catalogue'
    );
  });

  test('signale l\'absence de catégorie', () => {
    expect(
      getCatalogueVisibilityIssues({ ...visible, productCategory: undefined } as unknown as Product)
    ).toContain('Aucune catégorie rattachée');
  });

  test('signale une catégorie inactive', () => {
    const issues = getCatalogueVisibilityIssues({
      ...visible,
      productCategory: { name: 'Old', active: false } as any,
    });
    expect(issues.some((i) => i.includes('inactive'))).toBe(true);
  });
});

describe('Économie catalogue', () => {
  test('% d\'économie vs prix catalogue public', () => {
    const p = makeProduct({ price: 80, catalogPrice: 100 });
    expect(getCatalogSavingsPercent(p)).toBe(20);
  });

  test('null si pas de prix catalogue', () => {
    expect(getCatalogSavingsPercent(makeProduct({ catalogPrice: undefined }))).toBeNull();
  });

  test('null si aucune économie (prix ≥ catalogue)', () => {
    expect(getCatalogSavingsPercent(makeProduct({ price: 120, catalogPrice: 100 }))).toBeNull();
  });
});
