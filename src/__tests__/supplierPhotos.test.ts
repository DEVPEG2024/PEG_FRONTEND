/**
 * Photos des produits Master Print — correspondance avec le catalogue
 * fournisseur (src/utils/supplierPhotos.ts).
 *   npx jest src/__tests__/supplierPhotos.test.ts
 */
import type { ImbretexProduct, ImbretexVariant } from '@/@types/imbretex';
import type { PhotoProduct } from '@/@types/supplierPhotos';
import {
  brandFamily,
  brandKey,
  brandsCompatible,
  colorKey,
  coverageLine,
  firstImage,
  indexSupplierProduct,
  matchColors,
  matchProduct,
  nameCodes,
  photoPlan,
  variantStartsWith,
} from '@/utils/supplierPhotos';
import { imagesForColor } from '@/utils/offerConfigurator';

/** Variante fabriquée au format de src/@types/imbretex.ts (seuls les champs lus comptent). */
const variant = (
  ref: string,
  color: string,
  hex: string,
  images: Array<{ url: string; type: number }>,
  title = 'T-shirt homme V Triblend'
): ImbretexVariant =>
  ({
    variantReference: ref,
    title: { fr: title, en: title, de: title },
    longTitle: { fr: `${title} 130 g`, en: title, de: title },
    keywords: [{ fr: ['triblend', 'col V'], en: ['triblend'], de: [] }],
    attributes: [
      { type: 'color', value: color, hex },
      { type: 'sizes', value: 'M' },
    ],
    images: images.map((i, n) => ({ name: `img${n}`, ...i })),
  }) as unknown as ImbretexVariant;

const product = (
  reference: string,
  brand: string,
  variants: ImbretexVariant[],
  images: Array<{ url: string; type: number }> = []
): ImbretexProduct =>
  ({
    reference,
    brands: { name: brand, logo: null },
    variants,
    images: images.map((i, n) => ({ name: `p${n}`, ...i })),
    links: [],
  }) as unknown as ImbretexProduct;

const tm057 = product('BCTM057', 'B&C Collection', [
  variant('BCTM057-BLK-S', 'Black', '#111111', [
    { url: 'https://admin.imbretex.fr/tm057-black-back.jpg', type: 2 },
    { url: 'https://admin.imbretex.fr/tm057-black.jpg', type: 1 },
  ]),
  variant('BCTM057-BLK-M', 'Black', '#111111', []),
  variant('BCTM057-RED-S', 'Red', '#d01020', [
    { url: 'https://admin.imbretex.fr/tm057-red.jpg', type: 1 },
  ]),
  variant('BCTM057-HNA-S', 'Heather Navy', '#2b3550', [
    { url: 'https://admin.imbretex.fr/tm057-hnavy.jpg', type: 1 },
  ]),
]);
const e150 = product(
  'K3001',
  'B&C',
  [
    variant(
      'K3001-NOI',
      'Noir',
      '#000000',
      [{ url: 'https://admin.imbretex.fr/e150.jpg', type: 1 }],
      'T-shirt #E150 homme'
    ),
  ],
  [{ url: 'https://admin.imbretex.fr/e150-main.jpg', type: 1 }]
);
const kariban = product('K356', 'Kariban', [
  variant('K356-BL', 'White', '#ffffff', [
    { url: 'https://admin.imbretex.fr/k356.jpg', type: 1 },
  ]),
]);
const index = [tm057, e150, kariban].map(indexSupplierProduct);

const mp = (p: Partial<PhotoProduct>): PhotoProduct => ({
  documentId: 'doc1',
  name: 'B&C V Triblend/men T-Shirt',
  active: true,
  mpProductId: 'b-c-tm057-120',
  brand: 'B&C',
  sku: 'TM057',
  category: 'textile',
  kind: 'textile',
  colors: [],
  offerColors: [],
  offerActive: true,
  imageCount: 0,
  photos: { byColor: {}, gallery: [], supplierRef: null, updatedAt: null },
  error: null,
  ...p,
});

describe('normalisations', () => {
  test('marques', () => {
    expect(brandKey('B&C Collection')).toBe('BC');
    expect(brandKey('B&C')).toBe('BC');
    expect(brandKey('Stanley/Stella')).toBe('STANLEYSTELLA');
    expect(brandsCompatible('KARIBAN', 'KARIBANPREMIUM')).toBe(true);
    expect(brandsCompatible('BC', 'BCX')).toBe(false);
    expect(brandsCompatible('', 'BC')).toBe(false);
    expect(brandFamily('B&C Outerwear')).toBe('BC');
    expect(brandFamily('Kariban Premium')).toBe('KARIBAN');
    expect(brandFamily('Stanley/Stella')).toBe('STANLEYSTELLA');
  });
  test('références de variante', () => {
    expect(variantStartsWith('TM057-BLK-S', 'TM057')).toBe(true);
    expect(variantStartsWith('BC-TM057-S', 'TM057')).toBe(true);
    expect(variantStartsWith('BCTM057-BLK-S', 'TM057')).toBe(true);
    expect(variantStartsWith('TM057BLKS', 'TM057')).toBe(true);
    // Référence qui finit par une lettre : séparateur exigé.
    expect(variantStartsWith('TU01TBLK', 'TU01T')).toBe(false);
    expect(variantStartsWith('TU01T-BLK', 'TU01T')).toBe(true);
    expect(variantStartsWith('TM0571-S', 'TM057')).toBe(false);
  });
  test('codes du nom', () => {
    expect(nameCodes('B&C #E150 T-Shirt')).toEqual(['E150']);
  });
  test('coloris anglais et français', () => {
    expect(colorKey('Black Pure')).toBe('noir pur');
    expect(colorKey('Noir pur')).toBe('noir pur');
    expect(colorKey('heather-navy')).toBe('bleu marine chine');
    expect(colorKey('Bleu marine chiné')).toBe('bleu marine chine');
  });
});

describe('index du catalogue fournisseur', () => {
  test('un coloris par nom, sa première photo (plus petit type)', () => {
    const e = index[0];
    expect(e.ref).toBe('BCTM057');
    expect(e.brandKey).toBe('BC');
    expect(e.colors.map((c) => [c.name, c.imageUrl])).toEqual([
      ['Black', 'https://admin.imbretex.fr/tm057-black.jpg'],
      ['Red', 'https://admin.imbretex.fr/tm057-red.jpg'],
      ['Heather Navy', 'https://admin.imbretex.fr/tm057-hnavy.jpg'],
    ]);
    expect(e.mainImage).toBe('https://admin.imbretex.fr/tm057-black.jpg');
    expect(index[1].mainImage).toBe('https://admin.imbretex.fr/e150-main.jpg');
  });
  test('préprod : adresse d’image corrigée', () => {
    expect(
      firstImage([
        {
          name: 'a',
          type: 1,
          url: 'https://admin.preprod.imbretex-upgrade.hegyd.net/x.jpg',
        },
      ])
    ).toBe('https://www.imbretex.fr/x.jpg');
    expect(firstImage(undefined)).toBeNull();
  });
});

describe('correspondance d’un produit Master Print', () => {
  test('sûre : même marque, référence précédée d’un préfixe de marque', () => {
    const r = matchProduct(mp({}), index);
    expect(r.level).toBe('sure');
    expect(r.entry?.reference).toBe('BCTM057');
  });
  test('probable : code du nom présent dans le titre', () => {
    const r = matchProduct(
      mp({ name: 'B&C #E150 T-Shirt', sku: 'TU01T' }),
      index
    );
    expect(r.level).toBe('probable');
    expect(r.entry?.reference).toBe('K3001');
  });
  test('gamme de la marque chez Master Print (« B&C Outerwear ») = marque chez le fournisseur', () => {
    const fm = indexSupplierProduct(
      product('BCFM717', 'B&C Collection', [
        variant('BCFM717-S', 'Black', '#000000', []),
      ])
    );
    const r = matchProduct(mp({ brand: 'B&C Outerwear', sku: 'FM717' }), [
      ...index,
      fm,
    ]);
    expect(r.level).toBe('sure');
    expect(r.entry?.reference).toBe('BCFM717');
  });
  test('autre marque : jamais retenue', () => {
    expect(matchProduct(mp({ brand: 'Gildan' }), index).level).toBe('notFound');
  });
  test('plusieurs candidats sûrs : à choisir', () => {
    const twin = indexSupplierProduct(
      product('TM057', 'B&C', [variant('TM057-S', 'Black', '#000', [])])
    );
    const r = matchProduct(mp({}), [...index, twin]);
    expect(r.level).toBe('choose');
    expect(r.candidates.map((c) => c.reference).sort()).toEqual([
      'BCTM057',
      'TM057',
    ]);
  });
  test('produit non textile : pas de photo de fabricant', () => {
    expect(
      matchProduct(mp({ kind: 'other', category: 'large-format' }), index).level
    ).toBe('noSupplierPhoto');
  });
  test('introuvable', () => {
    expect(matchProduct(mp({ sku: 'ZZ999' }), index).level).toBe('notFound');
  });
});

describe('coloris et photos à copier', () => {
  const colors = [
    { code: 'black', label: 'Noir', hex: '#000000', pegColorDocumentId: null },
    {
      code: 'heather-navy',
      label: 'Bleu marine chiné',
      hex: '#2a3450',
      pegColorDocumentId: null,
    },
    {
      code: 'deep-red',
      label: 'Rouge foncé',
      hex: '#c8102e',
      pegColorDocumentId: null,
    },
    { code: 'white', label: 'Blanc', hex: '#ffffff', pegColorDocumentId: null },
  ];
  test('même nom d’abord, puis teinte la plus proche (signalée)', () => {
    const m = matchColors(colors, index[0].colors);
    expect(m.black.color.name).toBe('Black');
    expect(m.black.approx).toBe(false);
    expect(m['heather-navy'].color.name).toBe('Heather Navy');
    expect(m['deep-red'].color.name).toBe('Red');
    expect(m['deep-red'].approx).toBe(true);
    expect(m.white).toBeUndefined();
  });
  test('galerie : coloris par défaut de l’offre en premier', () => {
    const plan = photoPlan(
      { colors, offerColors: ['heather-navy', 'black'] },
      index[0]
    );
    expect(plan.total).toBe(2);
    expect(plan.covered).toBe(2);
    expect(plan.gallery[0]).toBe('https://admin.imbretex.fr/tm057-black.jpg');
    expect(plan.byColor['heather-navy']).toBe(
      'https://admin.imbretex.fr/tm057-hnavy.jpg'
    );
    const all = photoPlan({ colors, offerColors: [] }, index[0]);
    expect(all.covered).toBe(3);
    expect(all.total).toBe(4);
    expect(all.approx).toEqual(['deep-red']);
  });
  test('sans coloris retrouvé : photo principale du produit', () => {
    const plan = photoPlan(
      {
        colors: [
          { code: 'gold', label: 'Or', hex: null, pegColorDocumentId: null },
        ],
        offerColors: [],
      },
      index[1]
    );
    expect(plan.covered).toBe(0);
    expect(plan.gallery).toEqual(['https://admin.imbretex.fr/e150-main.jpg']);
  });
  test('résumé de couverture', () => {
    expect(
      coverageLine([
        'sure',
        'probable',
        'notFound',
        'choose',
        'noSupplierPhoto',
      ])
    ).toBe(
      '2 sur 4 produits textile trouvés · 1 à choisir · 1 sans photo de fabricant (grand format, adhésifs, film, PLV)'
    );
  });
});

describe('formulaire client : photo du coloris choisi', () => {
  const gallery = [
    { url: 'https://cdn.peg/a.jpg' },
    { url: 'https://cdn.peg/noir.jpg' },
  ];
  test('la photo du coloris passe devant, sans doublon', () => {
    expect(
      imagesForColor(gallery, {
        imageUrl: 'https://cdn.peg/noir.jpg',
        label: 'Noir',
      }).map((i) => i.url)
    ).toEqual(['https://cdn.peg/noir.jpg', 'https://cdn.peg/a.jpg']);
  });
  test('sans photo de coloris : la galerie normale', () => {
    expect(imagesForColor(gallery, { imageUrl: null })).toBe(gallery);
    expect(imagesForColor(gallery, undefined)).toBe(gallery);
  });
});
