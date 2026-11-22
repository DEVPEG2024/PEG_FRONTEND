/**
 * Catalogue Master Print en cartes — règles pures (src/utils/masterPrintCards.ts).
 *   npx jest src/__tests__/masterPrintCards.test.ts
 */
import type { MpCatalogResult } from '@/@types/masterPrint';
import {
  cardMeta,
  cardPegId,
  idsToFetch,
  lookOf,
  pegCardInfo,
  rankBadge,
} from '@/utils/masterPrintCards';

const result = (id: string, imported: string[] = []): MpCatalogResult => ({
  id,
  name: id,
  sku: null,
  brand: null,
  category: 'textile',
  bestSellerRank: null,
  imported: imported.map((documentId) => ({ documentId, name: documentId })),
});

describe('fiche PEG sur la carte', () => {
  it('prix « dès » = plus petit palier, prix de base = premier palier, petite image', () => {
    const info = pegCardInfo({
      documentId: 'p1',
      name: 'T-shirt',
      price: 20,
      priceTiers: [
        { minQuantity: 50, price: 9.5 },
        { minQuantity: 1, price: 15.62 },
        { minQuantity: 10, price: 12 },
      ],
      active: true,
      inCatalogue: false,
      images: [
        {
          url: '/uploads/big.png',
          formats: { small: { url: '/uploads/small_big.png' } },
        },
      ],
    });
    expect(info).toEqual({
      documentId: 'p1',
      imageUrl: '/uploads/small_big.png',
      priceFrom: 9.5,
      basePrice: 15.62,
      active: true,
      inCatalogue: false,
    });
  });

  it('sans paliers ni image : prix de base, pas d’image ; prix nul ignoré', () => {
    const info = pegCardInfo({
      documentId: 'p2',
      name: 'Roll-up',
      price: 0,
      priceTiers: null,
      active: null,
      inCatalogue: null,
      images: [],
    });
    expect(info.priceFrom).toBeNull();
    expect(info.imageUrl).toBeNull();
    expect(info.active).toBe(true);
    expect(
      pegCardInfo({
        documentId: 'p3',
        name: 'x',
        price: 42,
        priceTiers: [],
        active: false,
        inCatalogue: true,
        images: [{ url: 'u' }],
      })
    ).toMatchObject({
      priceFrom: 42,
      basePrice: 42,
      imageUrl: 'u',
      active: false,
    });
  });
});

describe('lecture par lots', () => {
  it('seulement les fiches importées pas encore connues, sans doublon', () => {
    const rs = [
      result('a', ['p1']),
      result('b'),
      result('c', ['p2', 'p9']),
      result('d', ['p1']),
    ];
    expect(cardPegId(rs[2])).toBe('p2');
    expect(idsToFetch(rs, new Set(['p2']))).toEqual([['p1']]);
    expect(idsToFetch(rs, new Set())).toEqual([['p1', 'p2']]);
    expect(
      idsToFetch(
        Array.from({ length: 5 }, (_, i) => result(`r${i}`, [`p${i}`])),
        new Set(),
        2
      )
    ).toEqual([['p0', 'p1'], ['p2', 'p3'], ['p4']]);
  });
});

describe('libellés de la carte', () => {
  it('famille, marque et référence, rang des ventes', () => {
    expect(lookOf('dtf').art).toBe('dtf');
    expect(lookOf('inconnue').art).toBe('print');
    expect(cardMeta({ brand: 'B&C', sku: 'TU01T' })).toBe('B&C · réf. TU01T');
    expect(cardMeta({ brand: null, sku: null })).toBe('');
    expect(rankBadge(1)).toBe('N° 1 des ventes');
    expect(rankBadge(51)).toBeNull();
    expect(rankBadge(null)).toBeNull();
  });
});
