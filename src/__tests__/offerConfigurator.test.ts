/**
 * Formulaire d'une offre configurable — règles pures (src/utils/offerConfigurator.ts)
 * et total d'un article du panier (cartItemTotal).
 *   npx jest src/__tests__/offerConfigurator.test.ts
 */
import type { OfferSpec } from '@/@types/masterPrint';
import type { Product } from '@/@types/product';
import {
  acceptAttr,
  fileMatches,
  formatsLabel,
  cmToMm,
  configBlocker,
  configForServer,
  formatDims,
  formatsForPosition,
  initialConfig,
  markingAt,
  mmToCm,
  optionHidden,
  selectionsFromConfig,
  shipDateLabel,
  totalPieces,
} from '@/utils/offerConfigurator';
import { cartItemTotal } from '@/utils/productHelpers';

const textile: OfferSpec = {
  kind: 'textile',
  name: 'T-shirt',
  description: null,
  quantity: { min: 5, max: null, step: 1 },
  productionDays: 7,
  colors: [
    { code: 'black', label: 'Noir', hex: '#000', sizes: ['S', 'M', 'L'] },
    { code: 'white', label: 'Blanc', hex: '#fff', sizes: ['M', 'L'] },
  ],
  sizes: ['S', 'M', 'L'],
  markings: {
    mode: 'client',
    min: 1,
    max: 2,
    fixed: [],
    positions: [
      {
        code: 'chest_left',
        label: 'Cœur',
        maxWidthMm: 120,
        maxHeightMm: 120,
        formats: ['coeur'],
      },
      {
        code: 'back',
        label: 'Dos',
        maxWidthMm: 380,
        maxHeightMm: 450,
        formats: ['coeur', 'a4', 'a3'],
      },
    ],
    techniques: [{ code: 'dtf', label: 'Transfert DTF' }],
    formats: [
      { code: 'coeur', label: 'Cœur', widthMm: 100, heightMm: 100 },
      { code: 'a4', label: 'A4', widthMm: 220, heightMm: 275 },
      { code: 'a3', label: 'A3', widthMm: 275, heightMm: 425 },
    ],
    customSize: false,
  },
  options: [],
  fixedOptions: [],
  format: null,
  pieces: null,
  ready: true,
};

const rollup: OfferSpec = {
  ...textile,
  kind: 'unit',
  quantity: { min: 1, max: 100, step: 1 },
  colors: [],
  sizes: [],
  markings: null,
  options: [
    {
      code: 'media',
      label: 'Média',
      type: 'select',
      required: false,
      values: [
        { code: 'bache', label: 'Bâche', description: null, default: true },
        { code: 'poly', label: 'Polyester', description: null, default: false },
      ],
      notWithFormats: ['45'],
    },
  ],
  format: {
    mode: 'client',
    formats: [
      {
        code: '45',
        label: 'Structure seule',
        widthMm: 850,
        heightMm: 2000,
        printed: false,
      },
      {
        code: '4',
        label: 'Structure + visuel',
        widthMm: 850,
        heightMm: 2000,
        printed: true,
      },
    ],
    free: null,
  },
};

const film: OfferSpec = {
  ...rollup,
  kind: 'length',
  options: [],
  format: null,
  pieces: {
    maxCount: 30,
    sideMin: 1,
    sideMax: 50000,
    maxQuantity: 1000,
    rollWidthMm: 550,
  },
};

describe('formulaire d’une offre configurable', () => {
  test('départ : premier coloris, marquage obligatoire déjà placé à la plus grande taille', () => {
    const c = initialConfig(textile);
    expect(c.color).toBe('black');
    expect(c.markings).toEqual([
      { position: 'chest_left', format: 'coeur', technique: 'dtf' },
    ]);
    expect(markingAt(textile, 'back')).toEqual({
      position: 'back',
      format: 'a3',
      technique: 'dtf',
    });
    expect(
      formatsForPosition(textile, 'chest_left').map((f) => f.code)
    ).toEqual(['coeur']);
  });

  test('départ roll-up : format imprimé d’abord, option par défaut', () => {
    const c = initialConfig(rollup);
    expect(c.format).toBe('4');
    expect(c.options).toEqual({ media: 'bache' });
    expect(c.quantity).toBe(1);
  });

  test('ce qui bloque le chiffrage', () => {
    const c = initialConfig(textile);
    expect(configBlocker(textile, c)).toMatch(/quantités par taille/);
    expect(configBlocker(textile, { ...c, sizes: { M: 2 } })).toMatch(
      /Minimum de commande : 5/
    );
    expect(
      configBlocker(textile, { ...c, sizes: { M: 3, L: 2 }, markings: [] })
    ).toMatch(/emplacement/);
    expect(configBlocker(textile, { ...c, sizes: { M: 3, L: 2 } })).toBeNull();
    expect(configBlocker({ ...textile, ready: false }, c)).toMatch(
      /pas disponible/
    );
    expect(
      configBlocker(film, {
        pieces: [{ width_mm: 0, height_mm: 10, quantity: 1 }],
      })
    ).toMatch(/dimensions/);
  });

  test('envoi au serveur : quantités nulles et options sans objet retirées', () => {
    const t = configForServer(textile, {
      color: 'black',
      sizes: { S: 0, M: 3 },
      markings: [{ position: 'back', format: 'a4' }],
      options: {},
    });
    expect(t).toEqual({
      color: 'black',
      sizes: { M: 3 },
      markings: [{ position: 'back', format: 'a4' }],
    });
    const r = configForServer(rollup, {
      quantity: 2,
      format: '45',
      options: { media: 'poly' },
    });
    expect(r).toEqual({ quantity: 2, format: '45' });
    expect(optionHidden(rollup.options[0], { format: '45' })).toBe(true);
  });

  test('quantités', () => {
    expect(totalPieces(textile, { sizes: { M: 2, L: 3 } })).toBe(5);
    expect(
      totalPieces(film, {
        pieces: [
          { width_mm: 10, height_mm: 10, quantity: 4 },
          { width_mm: 10, height_mm: 10, quantity: 6 },
        ],
      })
    ).toBe(10);
  });

  test('sélections du panier lisibles par les écrans existants', () => {
    expect(
      selectionsFromConfig(textile, { color: 'white', sizes: { M: 2, L: 0 } })
    ).toEqual([
      {
        size: { documentId: 'mp-M', name: 'M', value: 'M', description: '' },
        color: {
          documentId: 'mp-white',
          name: 'Blanc',
          value: 'white',
          description: '',
        },
        quantity: 2,
      },
    ]);
    expect(selectionsFromConfig(rollup, { quantity: 3 })[0].quantity).toBe(3);
    expect(selectionsFromConfig(film, { pieces: [] })[0].size.value).toBe(
      'DEFAULT'
    );
  });

  test('unités et dates', () => {
    expect(mmToCm(425)).toBe(42.5);
    expect(cmToMm('42,5')).toBe(425);
    expect(cmToMm('abc')).toBe(0);
    expect(formatDims({ widthMm: 220, heightMm: 275 })).toBe('22 × 27.5 cm');
    expect(shipDateLabel('2026-12-03')).toMatch(/3 décembre/);
    expect(shipDateLabel(null)).toBeNull();
  });
});

describe('formats des visuels', () => {
  test('PDF seul pour l’impression, image acceptée pour un marquage', () => {
    expect(fileMatches('logo.PNG', ['pdf', 'png'])).toBe(true);
    expect(fileMatches('logo.png', ['pdf'])).toBe(false);
    expect(fileMatches('sans-extension', ['pdf'])).toBe(false);
    expect(formatsLabel(['pdf'])).toBe('PDF');
    expect(formatsLabel(['pdf', 'png', 'jpg', 'jpeg', 'svg'])).toBe(
      'PDF, PNG, JPG ou SVG'
    );
    expect(acceptAttr(['pdf', 'png'])).toBe('.pdf,.png');
  });
});

describe('total d’un article du panier', () => {
  const product = {
    priceTiers: [{ minQuantity: 1, price: 10 }],
    inCatalogue: true,
  } as unknown as Product;
  const sizeAndColors = [
    {
      size: { documentId: 'a', name: 'M', value: 'M', description: '' },
      color: { documentId: 'b', name: 'Noir', value: 'n', description: '' },
      quantity: 4,
    },
  ];

  test('offre configurable : le prix du serveur, jamais recalculé (remise Premium déjà comprise)', () => {
    const item = {
      product,
      sizeAndColors,
      configurator: { price: { totalExclTax: 123.45 } },
    };
    expect(cartItemTotal(item, { premium: true } as never)).toBe(123.45);
  });

  test('article ordinaire : tarif du produit, remise Premium au catalogue public', () => {
    expect(cartItemTotal({ product, sizeAndColors }, null)).toBe(40);
    expect(
      cartItemTotal({ product, sizeAndColors }, { premium: true } as never)
    ).toBe(34);
  });
});
