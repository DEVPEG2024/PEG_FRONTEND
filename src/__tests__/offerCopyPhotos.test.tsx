/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CopyOffersPhotos from '@/views/app/admin/products/copy/CopyOffersPhotos';
import { rememberCopy } from '@/views/app/admin/products/copy/offerCopy';

// Étape Photos de « Copier les offres d'un client » : vrai écran, serveur
// simulé. Régression visée : « Publier » ne réactive QUE les copies, jamais une
// offre que l'admin avait désactivée exprès (GROPPI, NICOMATIC en prod).

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const gql = (data: unknown) => Promise.resolve({ data: { data } });

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/components/shared', () => ({
  Loading: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/Upload/WatermarkModal', () => () => null);
jest.mock('@/services/FileServices', () => ({
  apiGetPegFiles: jest.fn(),
  apiUploadFile: jest.fn(),
}));

const hidden = [
  {
    documentId: 'copy-casquette',
    name: 'Casquette US EXEMPLE',
    images: [
      {
        documentId: 'photo-esdl',
        url: 'https://s3/casquette-esdl.png',
        name: 'c.png',
      },
    ],
  },
  {
    documentId: 'copy-bonnet',
    name: 'Bonnet US EXEMPLE',
    images: [
      {
        documentId: 'photo-us',
        url: 'https://s3/bonnet-us.png',
        name: 'b.png',
      },
    ],
  },
  { documentId: 'vieille-offre', name: 'Offre désactivée exprès', images: [] },
];

jest.mock('@/services/OfferCopyServices', () => ({
  apiGetClientHiddenOffers: jest.fn(() =>
    gql({ products_connection: { nodes: hidden } })
  ),
  apiGetClientOwnOffers: jest.fn(() =>
    gql({
      products_connection: {
        nodes: [
          {
            documentId: 'casquette-esdl',
            images: [{ documentId: 'photo-esdl' }],
          },
        ],
      },
    })
  ),
}));

const apiUpdateProduct = jest.fn((p: { documentId: string }) =>
  gql({ updateProduct: { documentId: p.documentId } })
);
jest.mock('@/services/ProductServices', () => ({
  apiUpdateProduct: (p: { documentId: string }) => apiUpdateProduct(p),
}));

const target = { documentId: 'us', name: 'US EXEMPLE', logo: null };

let container: HTMLDivElement;
let root: Root;

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

beforeEach(async () => {
  localStorage.clear();
  apiUpdateProduct.mockClear();
  rememberCopy('us', 'esdl', ['copy-casquette', 'copy-bonnet']);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <CopyOffersPhotos target={target} />
      </MemoryRouter>
    );
  });
  await flush();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (label: string) =>
  Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === label
  ) as HTMLButtonElement;

describe('copie d’offres — étape Photos', () => {
  it('ne montre que les copies, avec l’état de chaque photo', () => {
    const text = container.textContent ?? '';
    expect(text).toContain('Casquette US EXEMPLE');
    expect(text).toContain('Bonnet US EXEMPLE');
    expect(text).not.toContain('Offre désactivée exprès');
    expect(text).toContain('Logo du client d’origine'); // casquette : photo d'ESDL
    expect(text).toContain('Changée'); // bonnet : nouvelle photo
    expect(text).toContain('1 offre prête sur 2');
    expect(text).toContain('1 photo montre encore le logo du client d’origine');
  });

  it('« Garder cette photo » rend l’offre prête', async () => {
    await act(async () => button('Garder cette photo').click());
    expect(container.textContent).toContain('2 offres prêtes sur 2');
    expect(button('Publier pour US EXEMPLE')).toBeTruthy();
  });

  it('« Publier » active les copies et rien d’autre', async () => {
    await act(async () => button('Publier quand même').click());
    await flush();
    const published = apiUpdateProduct.mock.calls.map(([p]) => p);
    expect(published).toEqual([
      { documentId: 'copy-casquette', active: true },
      { documentId: 'copy-bonnet', active: true },
    ]);
  });
});
