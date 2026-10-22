/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OffersGrid from '@/views/app/customer/home/components/OffersGrid';
import {
  HOME_OFFERS,
  buildOfferShowcase,
} from '@/views/app/customer/home/offerShowcase';
import { Product } from '@/@types/product';

// Accueil client (23/10/2026) : ESDL DOUVAINE a 9 offres, la grille n'en
// montrait que 8 — sa bâche, produit plus ancien rangé après les nouveautés,
// n'apparaissait que dans « Mes offres ».

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date('2026-10-23T09:00:00');

const offer = (documentId: string, name: string, createdAt: string): Product =>
  ({
    documentId,
    name,
    createdAt,
    images: [],
    priceTiers: [{ minQuantity: 1, price: 10 }],
    productCategory: { documentId: 'cat', name: 'Textile' },
  }) as unknown as Product;

// Offres réelles d'ESDL, dans l'ordre renvoyé par l'API
const esdl = [
  offer('182', 'T-shirt ECO 150 g/m² ESDL', '2026-01-28T18:38:00Z'),
  offer('232', 'Bache standard PVC', '2026-03-19T11:18:00Z'),
  offer('661', 'Casquette ESDL', '2026-10-20T14:29:00Z'),
  offer('664', 'Bonnet ESDL', '2026-10-20T14:35:00Z'),
  offer('665', 'Meug (x10)', '2026-10-20T14:36:00Z'),
  offer('667', 'Gourde ESDL', '2026-10-20T14:49:00Z'),
  offer('668', 'ROLL-UP 85x200 cm ESDL', '2026-10-20T14:53:00Z'),
  offer('669', 'PACK ESDL NOEL POUR ENFANTS', '2026-10-20T16:38:00Z'),
  offer('694', 'Brassard Capitaine', '2026-10-22T22:06:00Z'),
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderGrid = (products: Product[]) =>
  act(() =>
    root.render(
      <OffersGrid
        offers={buildOfferShowcase(products, null, NOW)}
        total={products.length}
        customerName="ESDL DOUVAINE"
        onOpen={jest.fn()}
        onSeeAll={jest.fn()}
      />
    )
  );

const cardNames = () =>
  Array.from(container.querySelectorAll('button.pco-lift')).map(
    (b) => b.textContent ?? ''
  );

describe('accueil client — grille des offres', () => {
  it('les 9 offres d’ESDL sont toutes affichées, bâche comprise', () => {
    renderGrid(esdl);
    const names = cardNames();
    expect(names).toHaveLength(9);
    expect(names.some((n) => n.includes('Bache standard PVC'))).toBe(true);
    expect(container.textContent).toContain('Ouvrir Mes offres');
  });

  it('au-delà de la limite, le lien annonce toutes les offres', () => {
    const many = Array.from({ length: HOME_OFFERS + 1 }, (_, i) =>
      offer(`p${i}`, `Offre ${i}`, '2026-10-20T10:00:00Z')
    );
    renderGrid(many);
    expect(cardNames()).toHaveLength(HOME_OFFERS);
    expect(container.textContent).toContain(
      `Voir les ${HOME_OFFERS + 1} offres`
    );
  });
});
