/**
 * Tests — résolution de la vue de « Mes offres » (/customer/products).
 * Une règle de resolveOffersView par cas, dans l'ordre de priorité.
 */
import {
  isOffersReserved,
  showCatalogSuggestions,
  resolveOffersView,
  ResolveOffersViewInput,
} from '@/views/app/customer/products/lists/offersView';

const base: ResolveOffersViewInput = {
  hasCustomer: true,
  loading: false,
  contextLoaded: true,
  error: false,
  searchTerm: '',
  total: 0,
  catalogAccess: true,
  premium: true,
  premiumProcessed: false,
  premiumSince: null,
};

const view = (patch: Partial<ResolveOffersViewInput> = {}) =>
  resolveOffersView({ ...base, ...patch });

describe('resolveOffersView', () => {
  test('1. sans fiche client → noCustomer (avant tout le reste)', () => {
    expect(view({ hasCustomer: false, loading: true, error: true })).toBe(
      'noCustomer'
    );
  });

  test('2. contexte pas encore chargé → loading', () => {
    expect(view({ contextLoaded: false })).toBe('loading');
  });

  test('2. produits en cours de chargement → loading (jamais de vide prématuré)', () => {
    expect(view({ loading: true, total: 0 })).toBe('loading');
  });

  test('3. error est prioritaire sur list', () => {
    expect(view({ error: true, total: 12 })).toBe('error');
  });

  test('4. noResult seulement si une recherche est active', () => {
    expect(view({ total: 0, searchTerm: 'casquette' })).toBe('noResult');
    expect(view({ total: 0, searchTerm: '   ' })).toBe('premium');
    expect(view({ total: 0, searchTerm: '' })).toBe('premium');
  });

  test('5. total > 0 → list (avec ou sans recherche)', () => {
    expect(view({ total: 3 })).toBe('list');
    expect(view({ total: 3, searchTerm: 'tee' })).toBe('list');
  });

  test('6. catalogAccess === false + premium: true → noCatalogue', () => {
    expect(view({ catalogAccess: false, premium: true })).toBe('noCatalogue');
    expect(view({ catalogAccess: false, premium: false })).toBe('noCatalogue');
  });

  test('7. premium: undefined → unknown', () => {
    expect(view({ premium: undefined })).toBe('unknown');
    expect(view({ premium: null })).toBe('unknown');
  });

  test('8. premium: false → standard', () => {
    expect(view({ premium: false })).toBe('standard');
  });

  test('9. premium récent (premiumSince renseigné, non traité) → preparing', () => {
    expect(
      view({
        premium: true,
        premiumSince: '2026-09-01T10:00:00.000Z',
        premiumProcessed: false,
      })
    ).toBe('preparing');
  });

  test('10. ancien client migré (premiumSince null, non traité) → premium', () => {
    expect(
      view({ premium: true, premiumSince: null, premiumProcessed: false })
    ).toBe('premium');
  });

  test('10. premiumProcessed: true → premium', () => {
    expect(
      view({
        premium: true,
        premiumSince: '2026-09-01T10:00:00.000Z',
        premiumProcessed: true,
      })
    ).toBe('premium');
  });

  // Décision du 24/09/2026 : « Mes offres » est réservé aux Premium.
  test('11. Standard avec des offres → standard (jamais la liste)', () => {
    expect(view({ premium: false, total: 12 })).toBe('standard');
    expect(view({ premium: false, total: 12, searchTerm: 'tee' })).toBe(
      'standard'
    );
    // Ni erreur ni chargement produits : aucune requête n'est envoyée.
    expect(view({ premium: false, error: true })).toBe('standard');
    expect(view({ premium: false, loading: true })).toBe('standard');
    // …mais toujours après le contexte : pas de conclusion prématurée.
    expect(view({ premium: false, contextLoaded: false })).toBe('loading');
  });

  test('12. sans accès catalogue, un Standard garde ses offres (seul canal de commande)', () => {
    expect(view({ premium: false, catalogAccess: false, total: 3 })).toBe(
      'list'
    );
    expect(view({ premium: false, catalogAccess: false, total: 0 })).toBe(
      'noCatalogue'
    );
  });

  test('13. isOffersReserved : seul premium === false (avec catalogue) réserve', () => {
    expect(isOffersReserved(false, true)).toBe(true);
    expect(isOffersReserved(false, undefined)).toBe(true);
    expect(isOffersReserved(false, false)).toBe(false);
    expect(isOffersReserved(true, true)).toBe(false);
    // Statut inconnu : on ne retire jamais les offres.
    expect(isOffersReserved(undefined, true)).toBe(false);
    expect(isOffersReserved(null, true)).toBe(false);
  });

  test('catalogAccess undefined n’interdit pas le catalogue', () => {
    expect(view({ catalogAccess: undefined, premium: false })).toBe('standard');
  });
});

describe('accueil client : suggestions ou offres personnalisées', () => {
  const show = (catalogAccess: boolean, offersReserved: boolean, offersCount: number) =>
    showCatalogSuggestions({ catalogAccess, offersReserved, offersCount });

  test('des offres personnalisées visibles remplacent les suggestions', () => {
    expect(show(true, false, 3)).toBe(false);
    expect(show(true, false, 1)).toBe(false);
  });

  test('sans offre personnalisée : suggestions du catalogue', () => {
    expect(show(true, false, 0)).toBe(true);
  });

  test('client Standard (offres réservées au Premium) : il garde les suggestions', () => {
    expect(show(true, true, 4)).toBe(true);
  });

  test('sans accès au catalogue : jamais de suggestions', () => {
    expect(show(false, false, 0)).toBe(false);
    expect(show(false, false, 2)).toBe(false);
  });
});
