/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import OffersGrid from '@/views/app/customer/home/components/OffersGrid';
import FeaturedOffers from '@/views/app/customer/home/components/FeaturedOffers';
import {
  OFFERS_CAROUSEL_INTERVAL,
  buildOfferShowcase,
} from '@/views/app/customer/home/offerShowcase';
import { Product } from '@/@types/product';

// Accueil client : TOUTES les offres sont sur la page, sans « Voir plus »
// (demande du 06/11/2026). Le 23/10/2026, ESDL DOUVAINE avait 9 offres et la
// grille n'en montrait que 8 : sa bâche n'apparaissait que dans « Mes offres ».

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockCarouselProps = jest.fn();
jest.mock('@/components/shared/Carousel', () => ({
  __esModule: true,
  default: (props: { children: React.ReactNode }) => {
    mockCarouselProps(props);
    return <div>{props.children}</div>;
  },
}));

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
  mockCarouselProps.mockClear();
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
        customerName="ESDL DOUVAINE"
        onOpen={jest.fn()}
      />
    )
  );

const cardNames = () =>
  Array.from(container.querySelectorAll('button.pco-lift')).map(
    (b) => b.textContent ?? ''
  );

describe('accueil client — toutes les offres sur la page', () => {
  it('les 9 offres d’ESDL sont toutes affichées, bâche comprise', () => {
    renderGrid(esdl);
    const names = cardNames();
    expect(names).toHaveLength(9);
    expect(names.some((n) => n.includes('Bache standard PVC'))).toBe(true);
    expect(container.textContent).toContain(
      '9 offres préparées pour ESDL DOUVAINE'
    );
  });

  it('50 offres : les 50 cartes sont là, aucun lien « Voir plus »', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      offer(`p${i}`, `Offre ${i}`, '2026-10-20T10:00:00Z')
    );
    renderGrid(many);
    expect(cardNames()).toHaveLength(50);
    expect(container.textContent).not.toMatch(/Voir les|Mes offres|Voir plus/);
  });
});

describe('accueil client — carrousel des offres', () => {
  const renderFeatured = (products: Product[]) =>
    act(() =>
      root.render(
        <FeaturedOffers
          offers={buildOfferShowcase(products, null, NOW)}
          onOpen={jest.fn()}
        />
      )
    );

  it('défile tout seul, une offre toutes les 3 secondes', () => {
    renderFeatured(esdl.slice(0, 3));
    expect(OFFERS_CAROUSEL_INTERVAL).toBe(3000);
    expect(mockCarouselProps).toHaveBeenCalledWith(
      expect.objectContaining({ autoplay: 'step', interval: 3000 })
    );
  });

  it('plus de lien « Toutes mes offres » : seul « Commander » reste', () => {
    renderFeatured(esdl.slice(0, 2));
    expect(container.textContent).not.toContain('Toutes mes offres');
    expect(container.textContent).toContain('Commander');
  });
});
