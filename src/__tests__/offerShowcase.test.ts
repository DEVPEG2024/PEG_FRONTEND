/**
 * Tests — offres personnalisées mises en avant sur l'accueil client
 * (offre à la une, cartes, escalier des paliers, « Nouveau », compte à rebours).
 * Fonctions pures : aucun mock nécessaire.
 */
import {
  MAX_STEPS,
  NEW_OFFER_DAYS,
  OFFER_TILES,
  buildOfferShowcase,
  daysUntil,
  isNewOffer,
  offerCategories,
  offerSteps,
  toShowcaseItem,
} from '@/views/app/customer/home/offerShowcase';
import { Product } from '@/@types/product';
import { Customer } from '@/@types/customer';

const NOW = new Date('2026-10-21T18:00:00');

const tiers = (...pairs: [number, number][]) => pairs.map(([minQuantity, price]) => ({ minQuantity, price }));

// Fabrique minimale : seuls les champs lus par offerShowcase.
const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    documentId: 'p1',
    name: 'Tablier brodé',
    images: [],
    priceTiers: tiers([5, 24.9], [20, 21.5], [50, 19.9]),
    inCatalogue: false,
    ...overrides,
  } as Product);

const premium = { premium: true } as Customer;

describe('offerSteps — « Plus vous en prenez, moins c\'est cher »', () => {
  test('une marche par palier, triée par quantité, la moins chère en dernier', () => {
    const steps = offerSteps(makeProduct({ priceTiers: tiers([50, 19.9], [5, 24.9], [20, 21.5]) }));
    expect(steps.map((s) => s.quantity)).toEqual(['dès 5', 'dès 20', 'dès 50']);
    expect(steps.map((s) => s.price)).toEqual(['24,90 €', '21,50 €', '19,90 €']);
    expect(steps.map((s) => s.best)).toEqual([false, false, true]);
    expect(steps.map((s) => s.height)).toEqual([100, 70, 40]);
  });

  test('pas d\'escalier pour un seul palier, au m², en packs, ou si le prix monte', () => {
    expect(offerSteps(makeProduct({ priceTiers: tiers([1, 10]) }))).toEqual([]);
    expect(offerSteps(makeProduct({ pricingMode: 'm2' }))).toEqual([]);
    expect(offerSteps(makeProduct({ pricingMode: 'packs' }))).toEqual([]);
    expect(offerSteps(makeProduct({ priceTiers: tiers([1, 10], [10, 12]) }))).toEqual([]);
    expect(offerSteps(makeProduct({ priceTiers: tiers([1, 10], [10, 10]) }))).toEqual([]);
  });

  test(`au-delà de ${MAX_STEPS} paliers : les premiers et le dernier`, () => {
    const steps = offerSteps(makeProduct({ priceTiers: tiers([1, 10], [10, 9], [25, 8], [50, 7], [100, 6]) }));
    expect(steps).toHaveLength(MAX_STEPS);
    expect(steps.map((s) => s.quantity)).toEqual(['dès 1', 'dès 10', 'dès 25', 'dès 100']);
  });

  test('quantité 0 affichée « dès 1 », milliers séparés à la française', () => {
    const steps = offerSteps(makeProduct({ priceTiers: tiers([0, 0.29], [10000, 0.19]) }));
    expect(steps[0].quantity).toBe('dès 1');
    expect(steps[1].quantity).toMatch(/^dès 10\s000$/u);
  });

  test('la remise Premium suit la règle du catalogue public (une offre la garde à son prix)', () => {
    const offer = makeProduct({ priceTiers: tiers([1, 10], [10, 8]), inCatalogue: false });
    const catalogue = makeProduct({ priceTiers: tiers([1, 10], [10, 8]), inCatalogue: true });
    expect(offerSteps(offer, premium).map((s) => s.price)).toEqual(['10,00 €', '8,00 €']);
    expect(offerSteps(catalogue, premium).map((s) => s.price)).toEqual(['8,50 €', '6,80 €']);
  });
});

describe('toShowcaseItem', () => {
  test('même prix que la page Mes offres : premier palier, économie vs prix catalogue', () => {
    const item = toShowcaseItem(makeProduct({ catalogPrice: 26 }), premium, 0, NOW);
    expect(item.price).toBe('24,90 €');
    expect(item.unit).toBe("HT l'unité");
    expect(item.savings).toBe(4);
    expect(item.catalogue).toBe('26,00 €');
    expect(item.steps).toHaveLength(3);
    expect(item.note).toBeUndefined();
  });

  test('sans économie : ni autocollant ni prix barré', () => {
    const item = toShowcaseItem(makeProduct({ catalogPrice: 20 }), null, 0, NOW);
    expect(item.savings).toBeNull();
    expect(item.catalogue).toBeUndefined();
  });

  test('au m² : prix au m², phrase à la place de l\'escalier, jamais d\'autocollant', () => {
    const item = toShowcaseItem(
      makeProduct({ pricingMode: 'm2', pricePerM2: 38, priceTiers: [], price: 0, catalogPrice: 45 }),
      null, 0, NOW
    );
    expect(item.price).toBe('38,00 €');
    expect(item.unit).toBe('HT le m²');
    expect(item.savings).toBeNull();
    expect(item.steps).toEqual([]);
    expect(item.note).toMatch(/dimensions/);
  });

  test('en packs : prix du premier pack et tailles de packs', () => {
    const item = toShowcaseItem(
      makeProduct({ pricingMode: 'packs', priceTiers: tiers([50, 120], [100, 210], [250, 450]) }),
      null, 0, NOW
    );
    expect(item.price).toBe('120,00 €');
    expect(item.unit).toBe('HT le pack de 50');
    expect(item.steps).toEqual([]);
    expect(item.note).toBe('Vendu par packs de 50, 100, 250 pièces.');
  });

  test('fond studio en alternance, catégorie reprise', () => {
    const item = toShowcaseItem(
      makeProduct({ productCategory: { documentId: 'c1', name: 'Textile' } as Product['productCategory'] }),
      null, OFFER_TILES.length + 1, NOW
    );
    expect(item.tile).toBe(OFFER_TILES[1]);
    expect(item.category).toEqual({ id: 'c1', name: 'Textile' });
  });
});

describe('isNewOffer', () => {
  test(`« Nouveau » pendant ${NEW_OFFER_DAYS} jours après la création`, () => {
    expect(isNewOffer('2026-10-20T10:00:00', NOW)).toBe(true);
    expect(isNewOffer('2026-09-22T19:00:00', NOW)).toBe(true);
    expect(isNewOffer('2026-09-20T10:00:00', NOW)).toBe(false);
  });

  test('sans date, date invalide ou dans le futur : pas d\'étiquette', () => {
    expect(isNewOffer(undefined, NOW)).toBe(false);
    expect(isNewOffer('pas une date', NOW)).toBe(false);
    expect(isNewOffer('2026-11-01T10:00:00', NOW)).toBe(false);
  });
});

describe('buildOfferShowcase', () => {
  test('les nouvelles offres d\'abord, sans changer l\'ordre des autres', () => {
    const items = buildOfferShowcase(
      [
        makeProduct({ documentId: 'a', createdAt: '2026-01-01T00:00:00' }),
        makeProduct({ documentId: 'b', createdAt: '2026-10-15T00:00:00' }),
        makeProduct({ documentId: 'c' }),
        makeProduct({ documentId: 'd', createdAt: '2026-10-01T00:00:00' }),
      ],
      null,
      NOW
    );
    expect(items.map((o) => o.documentId)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('offerCategories', () => {
  const withCategory = (documentId: string, id?: string, name = id ?? '') =>
    toShowcaseItem(
      makeProduct({ documentId, productCategory: id ? ({ documentId: id, name } as Product['productCategory']) : undefined }),
      null, 0, NOW
    );

  test('une pastille par catégorie, avec son nombre d\'offres', () => {
    expect(offerCategories([withCategory('a', 't', 'Textile'), withCategory('b', 's', 'Signalétique'), withCategory('c', 't', 'Textile')]))
      .toEqual([{ id: 't', name: 'Textile', count: 2 }, { id: 's', name: 'Signalétique', count: 1 }]);
  });

  test('pas de filtre pour une seule catégorie (ou aucune)', () => {
    expect(offerCategories([withCategory('a', 't'), withCategory('b', 't')])).toEqual([]);
    expect(offerCategories([withCategory('a'), withCategory('b', 't')])).toEqual([]);
  });
});

describe('daysUntil — compte à rebours avant livraison', () => {
  test('jours calendaires, quelle que soit l\'heure', () => {
    expect(daysUntil('2026-10-28T08:00:00', NOW)).toBe(7);
    expect(daysUntil('2026-10-22T00:30:00', NOW)).toBe(1);
    expect(daysUntil('2026-10-21T09:00:00', NOW)).toBe(0);
  });

  test('rien sans date, avec une date invalide ou passée', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil('n/a', NOW)).toBeNull();
    expect(daysUntil('2026-10-20T23:00:00', NOW)).toBeNull();
  });
});
