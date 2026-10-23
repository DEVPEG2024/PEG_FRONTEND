/**
 * @jest-environment jsdom
 */
import {
  buildOfferCopyInput,
  copiesOf,
  copySourceOf,
  countTokenMatches,
  forgetCopy,
  keptKey,
  keptPhotosOf,
  offerIsReady,
  pendingCopyCounts,
  photoStatus,
  rememberCopy,
  replaceToken,
  setPhotoKept,
  suggestNameToken,
} from '@/views/app/admin/products/copy/offerCopy';
import { Product } from '@/@types/product';

// Copier les offres d'un client vers un autre (23/10/2026) : les offres
// d'ESDL DOUVAINE servent de base à un nouveau club.

const ESDL_OFFERS = [
  'T-shirt ECO 150 g/m² ESDL',
  'Bache standard PVC',
  'Casquette ESDL',
  'Bonnet ESDL',
  'Meug (x10)',
  'Gourde ESDL',
  'ROLL-UP 85x200 cm ESDL',
  'PACK ESDL NOEL POUR ENFANTS',
  'Brassard Capitaine',
];

describe('noms des copies', () => {
  it('propose le mot du client qui revient dans ses offres', () => {
    expect(suggestNameToken('ESDL DOUVAINE', ESDL_OFFERS)).toBe('ESDL');
    expect(suggestNameToken('GROPPI', ['Casquette GROPPI', 'Bonnet'])).toBe(
      'GROPPI'
    );
    expect(suggestNameToken('Nouveau club', ['Mug'])).toBe('');
  });

  it('remplace le mot entier, sans tenir compte de la casse', () => {
    expect(
      replaceToken('PACK ESDL NOEL POUR ENFANTS', 'ESDL', 'US EXEMPLE')
    ).toBe('PACK US EXEMPLE NOEL POUR ENFANTS');
    expect(replaceToken('Casquette esdl', 'ESDL', 'FC Léman')).toBe(
      'Casquette FC Léman'
    );
    expect(replaceToken('Gourde ESDLX', 'ESDL', 'US')).toBe('Gourde ESDLX');
    expect(replaceToken('Brassard Capitaine', 'ESDL', 'US')).toBe(
      'Brassard Capitaine'
    );
    expect(replaceToken('Bonnet ESDL', '  ', 'US')).toBe('Bonnet ESDL');
    expect(replaceToken('Tshirt NIcomatic 190 g/m²', 'Nicomatic', 'ESDL')).toBe(
      'Tshirt ESDL 190 g/m²'
    );
  });

  it('compte les noms touchés', () => {
    expect(countTokenMatches(ESDL_OFFERS, 'ESDL')).toBe(6);
    expect(countTokenMatches(ESDL_OFFERS, '')).toBe(0);
  });
});

describe('données de la copie', () => {
  const casquette = {
    documentId: 'casq',
    name: 'Casquette ESDL',
    description: 'Brodée',
    priceTiers: [{ minQuantity: 1, price: 12.5 }],
    pricingMode: 'tiers',
    inCatalogue: true,
    active: true,
    requiresBat: true,
    sizes: [{ documentId: 'tu' }],
    colors: [{ documentId: 'noir' }],
    form: { documentId: 'f1' },
    checklist: { documentId: 'chk' },
    productCategory: { documentId: 'vp', name: 'Vêtement personnalisé' },
    customerCategories: [{ documentId: 'asso' }],
    customers: [{ documentId: 'esdl' }, { documentId: 'autre' }],
    images: [],
  } as unknown as Product;

  const input = buildOfferCopyInput(casquette, ['1653'], {
    name: 'Casquette US EXEMPLE',
    customerDocumentId: 'us',
  });

  it('réservée au seul nouveau client, hors catalogue public, cachée', () => {
    expect(input.customers).toEqual(['us']);
    expect(input.customerCategories).toEqual([]);
    expect(input.inCatalogue).toBe(false);
    expect(input.active).toBe(false);
    expect(input.name).toBe('Casquette US EXEMPLE');
  });

  it('mêmes réglages que l’original, photos partagées', () => {
    expect(input).toMatchObject({
      priceTiers: [{ minQuantity: 1, price: 12.5 }],
      sizes: ['tu'],
      colors: ['noir'],
      form: 'f1',
      checklist: 'chk',
      productCategory: 'vp',
      requiresBat: true,
      images: ['1653'],
    });
    expect(input).not.toHaveProperty('batFile');
  });

  it('nom vide : on garde celui de l’original', () => {
    expect(
      buildOfferCopyInput(casquette, [], {
        name: '  ',
        customerDocumentId: 'us',
      }).name
    ).toBe('Casquette ESDL');
  });
});

describe('état des photos', () => {
  const source = new Set(['photo-esdl']);

  it('fichier encore celui du client d’origine : à changer ; nouveau fichier : changée', () => {
    expect(photoStatus('photo-esdl', source, new Set(), 'p')).toBe('todo');
    expect(photoStatus('photo-neuve', source, new Set(), 'p')).toBe('done');
  });

  it('gardée par l’admin, ou origine inconnue', () => {
    expect(
      photoStatus(
        'photo-esdl',
        source,
        new Set([keptKey('p', 'photo-esdl')]),
        'p'
      )
    ).toBe('kept');
    expect(photoStatus('photo-esdl', null, new Set(), 'p')).toBe('unknown');
  });

  it('une offre est prête quand plus aucune photo n’est à changer', () => {
    expect(offerIsReady(['done', 'kept'])).toBe(true);
    expect(offerIsReady(['done', 'todo'])).toBe(false);
    expect(offerIsReady([])).toBe(true);
  });
});

describe('mémoire de la copie (cet appareil)', () => {
  beforeEach(() => localStorage.clear());

  it('retient les copies, sans doublon, d’une copie à l’autre', () => {
    rememberCopy('us', 'esdl', ['c1', 'c2']);
    rememberCopy('us', 'esdl', ['c2', 'c3']);
    expect([...copiesOf('us')]).toEqual(['c1', 'c2', 'c3']);
    expect(copySourceOf('us')).toBe('esdl');
  });

  it('« à publier » ne compte que les copies, jamais les offres désactivées exprès', () => {
    rememberCopy('us', 'esdl', ['c1', 'c2']);
    const counts = pendingCopyCounts([
      { documentId: 'c1', customers: [{ documentId: 'us' }] },
      { documentId: 'c2', customers: [{ documentId: 'us' }] },
      { documentId: 'casquette-groppi', customers: [{ documentId: 'groppi' }] },
      { documentId: 'vieille-offre-us', customers: [{ documentId: 'us' }] },
    ]);
    expect(counts).toEqual({ us: 2 });
  });

  it('photos gardées, puis oubli après publication', () => {
    rememberCopy('us', 'esdl', ['c1']);
    setPhotoKept('us', keptKey('c1', 'img'), true);
    expect(keptPhotosOf('us').has('c1:img')).toBe(true);
    setPhotoKept('us', keptKey('c1', 'img'), false);
    expect(keptPhotosOf('us').size).toBe(0);
    forgetCopy('us');
    expect(copiesOf('us').size).toBe(0);
    expect(copySourceOf('us')).toBeNull();
  });

  it('stockage illisible : rien ne casse', () => {
    localStorage.setItem('peg_offer_copy_v1', '{pas du json');
    expect(copiesOf('us').size).toBe(0);
    expect(
      pendingCopyCounts([
        { documentId: 'c1', customers: [{ documentId: 'us' }] },
      ])
    ).toEqual({});
  });
});
