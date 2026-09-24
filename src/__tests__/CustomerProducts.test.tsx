/**
 * @jest-environment jsdom
 *
 * Tests — page client « Mes offres » (/customer/products).
 *
 * Verrouille le correctif principal : le secteur du client (customerCategory)
 * n'est PAS peuplé par /users/me → la page relit le client avant de charger
 * les produits, sinon les offres de secteur n'apparaissent jamais. Couvre aussi
 * les états (erreur ≠ vide, variantes Standard / en préparation / sans
 * catalogue) et la terminologie imposée.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@/services/ProductServices', () => ({
  apiGetCustomerProducts: jest.fn(),
  apiGetSuggestedProducts: jest.fn(),
}));
jest.mock('@/services/DashboardCustomerService', () => ({
  apiGetCustomerOffersContext: jest.fn(),
  apiGetDashboardCustomerInformations: jest.fn(),
}));
// PremiumServices (constantes Premium) importe PegBackendClient, qui lit
// import.meta.env (Vite) : illisible sous Jest → client remplacé.
jest.mock('@/services/PegBackendClient', () => ({
  PEG_BACKEND_BASE: '',
  pegBackendFetch: jest.fn(),
}));
jest.mock('@/views/app/common/categories/CatalogueBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="banner" />,
}));
jest.mock('@/store', () => {
  const rr = jest.requireActual('react-redux');
  return {
    __esModule: true,
    injectReducer: jest.fn(),
    // Action réelle = merge dans state.auth.user.user (userSlice.setOwnUser).
    setOwnUser: (payload: unknown) => ({ type: 'test/setOwnUser', payload }),
    useAppDispatch: rr.useDispatch,
    useAppSelector: rr.useSelector,
  };
});

import {
  apiGetCustomerProducts,
  apiGetSuggestedProducts,
} from '@/services/ProductServices';
import {
  apiGetCustomerOffersContext,
  apiGetDashboardCustomerInformations,
} from '@/services/DashboardCustomerService';
import customerProductsReducer from '@/views/app/customer/products/store';
import CustomerProducts from '@/views/app/customer/products/lists/CustomerProducts';
import CatalogueSelection from '@/views/app/customer/products/lists/components/CatalogueSelection';

const mockProducts = apiGetCustomerProducts as jest.Mock;
const mockSuggested = apiGetSuggestedProducts as jest.Mock;
const mockContext = apiGetCustomerOffersContext as jest.Mock;
const mockDashboard = apiGetDashboardCustomerInformations as jest.Mock;

const product = (documentId: string, name: string) => ({
  documentId,
  name,
  price: 10,
  images: [],
  description: '',
});

const gql = (nodes: unknown[], total = nodes.length) =>
  Promise.resolve({
    data: {
      data: {
        products_connection: {
          nodes,
          pageInfo: { page: 1, pageCount: 1, pageSize: 24, total },
        },
      },
    },
  });

const ctxResponse = (customer: Record<string, unknown> | null) =>
  Promise.resolve({ data: { data: { customer } } });

type AuthState = { user: { user: Record<string, unknown> } };

const makeStore = (customer: Record<string, unknown> | null = {}) =>
  configureStore({
    reducer: {
      auth: (
        s: AuthState = {
          user: {
            user:
              customer === null
                ? {}
                : {
                    customer: {
                      documentId: 'c1',
                      name: 'ACME',
                      premium: true,
                      ...customer,
                    },
                  },
          },
        },
        action: { type: string; payload?: Record<string, unknown> }
      ): AuthState =>
        action.type === 'test/setOwnUser'
          ? { user: { user: { ...s.user.user, ...action.payload } } }
          : s,
      customerProducts: customerProductsReducer,
    },
  });

let container: HTMLDivElement;
let root: Root;

const flush = async () => {
  // Plusieurs micro-tâches : contexte → thunk produits → suggestions.
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderPage = async (store = makeStore()) => {
  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/customer/products']}>
          <CustomerProducts />
        </MemoryRouter>
      </Provider>
    );
  });
  await flush();
};

/** Promesse résolue à la main (réponses dans le désordre). */
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const gqlBody = (nodes: unknown[], total = nodes.length) => ({
  data: {
    data: {
      products_connection: {
        nodes,
        pageInfo: { page: 1, pageCount: 1, pageSize: 24, total },
      },
    },
  },
});

const typeSearch = async (value: string) => {
  const input = container.querySelector('input') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    jest.advanceTimersByTime(450);
  });
};

const buttonByText = (text: string) =>
  Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text)
  );

const hrefs = () =>
  Array.from(container.querySelectorAll('a')).map((a) =>
    a.getAttribute('href')
  );

let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
const realConsoleError = console.error;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  // jsdom ne sait pas analyser @container (feuille OFFERS_PAGE_CSS) : bruit
  // sans effet sur le rendu testé. Toute autre erreur reste affichée.
  errorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      const first = args[0] as { message?: string } | string | undefined;
      const msg = typeof first === 'string' ? first : (first?.message ?? '');
      if (msg.includes('Could not parse CSS stylesheet')) return;
      realConsoleError(...args);
    });
  mockSuggested.mockResolvedValue({ products: [], curated: false });
  mockDashboard.mockReturnValue(ctxResponse(null));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  jest.clearAllMocks();
});

describe('CustomerProducts — données', () => {
  test('1. le secteur lu par le contexte est transmis à la requête produits', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        name: 'ACME',
        premium: true,
        catalogAccess: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(gql([product('p1', 'Tee-shirt brodé')]));
    await renderPage();
    expect(mockProducts).toHaveBeenCalledWith(
      'c1',
      'cat1',
      { page: 1, pageSize: 24 },
      ''
    );
  });

  test('2. contexte en échec → repli sur la requête du tableau de bord', async () => {
    mockContext.mockReturnValue(Promise.reject(new Error('400')));
    mockDashboard.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        name: 'ACME',
        catalogAccess: true,
        customerCategory: { documentId: 'cat2' },
      })
    );
    mockProducts.mockReturnValue(gql([product('p1', 'Tee-shirt brodé')]));
    await renderPage();
    expect(mockDashboard).toHaveBeenCalledWith('c1');
    expect(mockProducts).toHaveBeenCalledWith(
      'c1',
      'cat2',
      { page: 1, pageSize: 24 },
      ''
    );
  });

  test('3. le compteur affiche le total réel et « Voir plus » le reste', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    const nodes = Array.from({ length: 24 }, (_, i) =>
      product(`p${i}`, `Produit ${i}`)
    );
    mockProducts.mockReturnValue(gql(nodes, 30));
    await renderPage();
    expect(container.textContent).toContain('30');
    expect(container.textContent).toContain('offres disponibles');
    const more = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Afficher plus d')
    );
    expect(more?.textContent).toBe("Afficher plus d'offres (6 restante(s))");
  });

  test('4. une erreur API n’est jamais présentée comme une page vide', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(Promise.reject(new Error('500')));
    await renderPage();
    expect(container.textContent).toContain('Impossible de charger vos offres');
    expect(container.textContent).toContain('Réessayer');
    expect(container.textContent).not.toContain('Aucune offre personnalisée');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe('CustomerProducts — concurrence et montage', () => {
  const premiumCtx = () =>
    ctxResponse({
      documentId: 'c1',
      premium: true,
      catalogAccess: true,
      customerCategory: { documentId: 'cat1' },
    });
  const five = () =>
    Array.from({ length: 5 }, (_, i) => product(`p${i}`, `Produit ${i}`));

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('10. une réponse de recherche arrivée APRÈS l’effacement n’écrase pas la liste', async () => {
    mockContext.mockReturnValue(premiumCtx());
    const slow = deferred<unknown>();
    mockProducts
      .mockReturnValueOnce(gql(five())) // chargement initial
      .mockReturnValueOnce(slow.promise) // « zz » : en attente
      .mockReturnValueOnce(gql(five())); // effacement : répond tout de suite
    const store = makeStore();
    await renderPage(store);
    await typeSearch('zz');
    const clear = container.querySelector(
      'button[aria-label="Effacer la recherche"]'
    ) as HTMLButtonElement;
    await act(async () => clear.click());
    await flush();
    // La réponse de « zz » arrive en dernier, vide.
    await act(async () => slow.resolve(gqlBody([], 0)));
    await flush();
    expect(mockProducts.mock.calls.map((c) => c[3])).toEqual(['', 'zz', '']);
    expect(store.getState().customerProducts.data.total).toBe(5);
    expect(container.textContent).toContain('Produit 0');
    expect(container.textContent).not.toContain('incluses dans Premium');
  });

  test('11. l’échec d’une requête périmée n’affiche pas l’écran d’erreur', async () => {
    mockContext.mockReturnValue(premiumCtx());
    const first = deferred<unknown>();
    mockProducts
      .mockReturnValueOnce(gql(five()))
      .mockReturnValueOnce(first.promise) // « pr » : échouera tard
      .mockReturnValueOnce(gql(five())); // « pro » : réussit
    const store = makeStore();
    await renderPage(store);
    await typeSearch('pr');
    await typeSearch('pro');
    await flush();
    await act(async () => first.reject(new Error('500')));
    await flush();
    expect(store.getState().customerProducts.data.error).toBe(false);
    expect(container.textContent).not.toContain('Impossible de charger');
    expect(container.textContent).toContain('5 résultat(s) pour « pro »');
  });

  test('12. un « Voir plus » en échec garde la grille affichée', async () => {
    mockContext.mockReturnValue(premiumCtx());
    const nodes = Array.from({ length: 24 }, (_, i) =>
      product(`p${i}`, `Produit ${i}`)
    );
    mockProducts
      .mockReturnValueOnce(gql(nodes, 30))
      .mockImplementationOnce(() => Promise.reject(new Error('500')))
      .mockReturnValueOnce(gql(nodes, 30));
    await renderPage();
    await act(async () => buttonByText('Afficher plus d')?.click());
    await flush();
    expect(container.textContent).toContain('Produit 23');
    expect(container.textContent).not.toContain(
      'Impossible de charger vos offres'
    );
    expect(container.textContent).toContain(
      "Impossible de charger plus d'offres"
    );
    // Relance : même tranche (48), pas de saut à 72.
    await act(async () => buttonByText('Afficher plus d')?.click());
    await flush();
    expect(mockProducts.mock.calls.map((c) => c[2].pageSize)).toEqual([
      24, 48, 48,
    ]);
  });

  test('13. client arrivé après le montage (/users/me) → offres chargées', async () => {
    mockContext.mockReturnValue(premiumCtx());
    mockProducts.mockReturnValue(gql(five()));
    const store = makeStore(null);
    await renderPage(store);
    expect(container.textContent).toContain('en cours de configuration');
    expect(mockProducts).not.toHaveBeenCalled();
    await act(async () => {
      store.dispatch({
        type: 'test/setOwnUser',
        payload: { customer: { documentId: 'c1', name: 'ACME' } },
      });
    });
    await flush();
    expect(mockContext).toHaveBeenCalledWith('c1');
    expect(mockProducts).toHaveBeenCalledWith(
      'c1',
      'cat1',
      { page: 1, pageSize: 24 },
      ''
    );
    expect(container.textContent).toContain('Produit 0');
  });

  test('14. statut Premium relu → store aligné (prix des cartes et panier)', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        premiumProcessed: false,
        premiumSince: '2026-09-20T10:00:00.000Z',
        catalogAccess: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(gql(five()));
    const store = makeStore({ premium: false, catalogAccess: true });
    await renderPage(store);
    const customer = store.getState().auth.user.user.customer as Record<
      string,
      unknown
    >;
    expect(customer.premium).toBe(true);
    expect(customer.premiumSince).toBe('2026-09-20T10:00:00.000Z');
    expect(customer.name).toBe('ACME'); // le reste de la fiche est conservé
  });
});

describe('CustomerProducts — confidentialité', () => {
  test('15. la requête client des offres ne lit jamais productRef', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const src: string = fs.readFileSync(
      path.join(__dirname, '../services/ProductServices.ts'),
      'utf8'
    );
    const start = src.indexOf('export async function apiGetCustomerProducts');
    const end = src.indexOf('export async function', start + 10);
    const body = src
      .slice(start, end)
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    expect(start).toBeGreaterThan(-1);
    expect(body).not.toMatch(/\bproductRef\b/);
  });
});

describe('CustomerProducts — états vides', () => {
  test('5. Standard sans offre → Premium proposé + sélection du catalogue', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: false,
        catalogAccess: true,
        customerCategory: null,
      })
    );
    mockProducts.mockReturnValue(gql([]));
    await renderPage();
    expect(hrefs()).toContain('/customer/premium');
    expect(hrefs()).toContain('/customer/devis');
    expect(mockSuggested).toHaveBeenCalled();
  });

  test('6. sans accès catalogue → ni catalogue, ni Premium, ni suggestions', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        catalogAccess: false,
        customerCategory: null,
      })
    );
    mockSuggested.mockResolvedValue({
      products: [product('s1', 'Mug catalogue')],
      curated: false,
    });
    mockProducts.mockReturnValue(gql([]));
    await renderPage();
    expect(container.textContent).toContain(
      'Aucune offre disponible pour le moment'
    );
    expect(hrefs()).not.toContain('/customer/catalogue');
    expect(hrefs()).not.toContain('/customer/premium');
    expect(mockSuggested).not.toHaveBeenCalled();
  });

  test('7. Premium récent → offres en préparation + frise', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        premiumProcessed: false,
        premiumSince: '2026-09-01T10:00:00.000Z',
        catalogAccess: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(gql([]));
    await renderPage();
    expect(container.textContent).toContain(
      'Vos offres personnalisées sont en préparation'
    );
    expect(container.querySelector('[aria-current="step"]')).not.toBeNull();
    expect(hrefs()).toContain('/customer/files');
  });
});

describe('CustomerProducts — suggestions', () => {
  test('8. avec des offres, aucune suggestion n’est chargée (pas de doublon)', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: true,
        catalogAccess: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockSuggested.mockResolvedValue({
      products: [product('p1', 'Tee-shirt brodé')],
      curated: false,
    });
    mockProducts.mockReturnValue(gql([product('p1', 'Tee-shirt brodé')]));
    await renderPage();
    expect(mockSuggested).not.toHaveBeenCalled();
    expect(container.textContent?.split('Tee-shirt brodé').length).toBe(2);
  });

  test('8. CatalogueSelection exclut les documentId déjà affichés', async () => {
    mockSuggested.mockResolvedValue({
      products: [product('p1', 'Tee-shirt brodé'), product('p2', 'Casquette')],
      curated: false,
    });
    await act(async () => {
      root.render(
        <Provider store={makeStore()}>
          <MemoryRouter>
            <CatalogueSelection
              title="Notre sélection du moment"
              excludeIds={['p1']}
            />
          </MemoryRouter>
        </Provider>
      );
    });
    await flush();
    expect(container.textContent).toContain('Casquette');
    expect(container.textContent).not.toContain('Tee-shirt brodé');
  });

  test('8. CatalogueSelection masquée si la sélection est vide ou en erreur', async () => {
    mockSuggested.mockRejectedValue(new Error('500'));
    await act(async () => {
      root.render(
        <Provider store={makeStore()}>
          <MemoryRouter>
            <CatalogueSelection
              title="Notre sélection du moment"
              excludeIds={[]}
            />
          </MemoryRouter>
        </Provider>
      );
    });
    await flush();
    expect(container.innerHTML).toBe('');
  });
});

describe('CustomerProducts — réservé aux Premium (décision du 24/09/2026)', () => {
  test('16. Standard dont le secteur a des offres → aucune requête, aucune offre, Premium proposé', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: false,
        catalogAccess: true,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(gql([product('p1', 'Tee-shirt brodé')]));
    await renderPage(makeStore({ premium: false }));
    expect(mockProducts).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Tee-shirt brodé');
    expect(hrefs()).toContain('/customer/premium');
    // Pas de recherche dans des offres qu'il ne voit pas.
    expect(container.querySelector('input')).toBeNull();
  });

  test('17. Standard sans accès catalogue → ses offres restent affichées', async () => {
    mockContext.mockReturnValue(
      ctxResponse({
        documentId: 'c1',
        premium: false,
        catalogAccess: false,
        customerCategory: { documentId: 'cat1' },
      })
    );
    mockProducts.mockReturnValue(gql([product('p1', 'Tee-shirt brodé')]));
    await renderPage(makeStore({ premium: false, catalogAccess: false }));
    expect(mockProducts).toHaveBeenCalled();
    expect(container.textContent).toContain('Tee-shirt brodé');
    expect(hrefs()).not.toContain('/customer/premium');
  });
});

describe('CustomerProducts — terminologie', () => {
  const scenarios: [string, Record<string, unknown> | null, unknown[]][] = [
    ['standard', { documentId: 'c1', premium: false, catalogAccess: true }, []],
    ['premium', { documentId: 'c1', premium: true, catalogAccess: true }, []],
    [
      'preparing',
      {
        documentId: 'c1',
        premium: true,
        premiumSince: '2026-09-01T10:00:00.000Z',
        catalogAccess: true,
      },
      [],
    ],
    [
      'noCatalogue',
      { documentId: 'c1', premium: true, catalogAccess: false },
      [],
    ],
    ['unknown', { documentId: 'c1', catalogAccess: true }, []],
    [
      'list',
      { documentId: 'c1', premium: true, catalogAccess: true },
      [product('p1', 'Tee-shirt brodé')],
    ],
  ];

  test.each(scenarios)(
    '9. vue %s : libellés imposés',
    async (_name, customer, nodes) => {
      mockContext.mockReturnValue(ctxResponse(customer));
      mockProducts.mockReturnValue(gql(nodes));
      // Vue « unknown » : le store ne connaît pas non plus le statut Premium.
      const store = makeStore(
        _name === 'unknown' ? { premium: undefined } : {}
      );
      await renderPage(store);
      const text = container.textContent ?? '';
      // La vue finale est bien rendue (pas l'état de chargement).
      expect(text).not.toContain('Chargement de vos offres');
      expect(text).toContain('Demander un devis');
      expect(text).not.toMatch(/demander une offre/i);
      expect(text).not.toMatch(/exclusi/i);
      expect(container.querySelector('h1')?.textContent).toBe(
        'Mes offres personnalisées'
      );
      if (_name === 'unknown') expect(text).not.toMatch(/premium/i);
    }
  );
});
