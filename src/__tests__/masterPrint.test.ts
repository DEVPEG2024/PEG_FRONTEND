/**
 * Onglet « Master Print » du projet — règles pures (src/utils/masterPrint.ts).
 *   npx jest src/__tests__/masterPrint.test.ts
 */
import type { MpDraftLine, MpProductView } from '@/@types/masterPrint';
import {
  addressIssues,
  canCancel,
  fileSlots,
  linesFromMapping,
  manualLineIssues,
  mappingToSave,
  margin,
  markingIssues,
  nextIdempotencyKey,
  nextSimulateEvents,
  optionDefaults,
  optionIssues,
  sizesForColor,
  slotLabel,
  isMasterPrintMissing,
  masterPrintError,
} from '@/utils/masterPrint';

const tshirt: MpProductView = {
  id: 'b-c-tu01t-140',
  name: 'B&C #E150 T-Shirt',
  sku: 'TU01T',
  brand: 'B&C',
  category: 'textile',
  pricingMode: 'unit',
  description: null,
  quantity: { min: 1, max: 100000, step: 1, note: null },
  colors: [
    { code: 'black', label: 'Black' },
    { code: 'white', label: 'White' },
  ],
  sizes: ['S', 'M', 'L', '2XL'],
  sizesByColor: { black: ['S', 'M', 'L'], white: ['M', 'L', '2XL'] },
  markings: {
    required: false,
    positions: [
      {
        code: 'chest_left',
        label: 'Cœur gauche',
        maxWidthMm: 120,
        maxHeightMm: 120,
      },
      { code: 'back', label: 'Dos', maxWidthMm: 380, maxHeightMm: 450 },
    ],
    techniques: [{ code: 'dtf', label: 'Transfert DTF' }],
    formats: [{ code: 'a4', label: 'A4', widthMm: 220, heightMm: 275 }],
  },
  otherOptions: [],
  dimensions: null,
};

const panneau: MpProductView = {
  ...tshirt,
  id: 'panneau-akilux-35mm-libre',
  name: 'Panneau Akilux',
  category: 'large-format',
  colors: [],
  sizes: [],
  sizesByColor: {},
  markings: null,
  otherOptions: [
    {
      code: 'print_sides',
      label: 'Impression',
      type: 'select',
      required: true,
      values: [
        { code: 'print_recto', label: 'Recto', default: true },
        { code: 'print_rv', label: 'Recto-verso', default: false },
      ],
    },
    {
      code: 'eyelets',
      label: 'Œillets',
      type: 'multi_select',
      required: false,
      values: [{ code: 'eyelets_4', label: '4 coins', default: false }],
    },
  ],
  dimensions: {
    freeFormat: true,
    standardFormats: [{ code: 'a1', label: 'A1', widthMm: 594, heightMm: 841 }],
    widthMm: { min: 100, max: 3000 },
    heightMm: { min: 100, max: 1500 },
    rollWidthMm: null,
    perLength: false,
  },
};

const draft: MpDraftLine[] = [
  {
    key: 'cNoir',
    pegColor: { documentId: 'cNoir', name: 'Noir' },
    pegSizes: [
      { documentId: 'sM', name: 'M', quantity: 5, mpSize: 'M' },
      { documentId: 'sL', name: 'L', quantity: 3, mpSize: 'L' },
    ],
    config: { product_id: 'b-c-tu01t-140', quantity: 8, options: {} },
    issues: [],
  },
  {
    key: 'cBlanc',
    pegColor: { documentId: 'cBlanc', name: 'Blanc' },
    pegSizes: [{ documentId: 'sXXL', name: 'XXL', quantity: 4, mpSize: '2XL' }],
    config: { product_id: 'b-c-tu01t-140', quantity: 4, options: {} },
    issues: [],
  },
];

const mapping = {
  productId: 'b-c-tu01t-140',
  colors: { cNoir: 'black', cBlanc: 'white' },
  sizes: { sM: 'M', sL: 'L', sXXL: '2XL' },
  markings: [{ position: 'chest_left', technique: 'dtf', format: 'a4' }],
};

describe('lignes depuis la commande PEG', () => {
  it('quantités de la commande, coloris et tailles traduits, mêmes marquages partout', () => {
    const lines = linesFromMapping(draft, mapping);
    expect(lines.map((l) => l.config)).toEqual([
      {
        product_id: 'b-c-tu01t-140',
        quantity: 8,
        options: {
          color: 'black',
          sizes: { M: 5, L: 3 },
          markings: mapping.markings,
        },
        production_time: 'standard',
      },
      {
        product_id: 'b-c-tu01t-140',
        quantity: 4,
        options: {
          color: 'white',
          sizes: { '2XL': 4 },
          markings: mapping.markings,
        },
        production_time: 'standard',
      },
    ]);
    expect(lines.every((l) => !l.issues.length)).toBe(true);
    // copie : modifier une ligne ne touche pas la correspondance
    expect(lines[0].config.options.markings).not.toBe(mapping.markings);
  });
  it('associations manquantes signalées, produit absent signalé', () => {
    const lines = linesFromMapping(draft, {
      ...mapping,
      colors: {},
      sizes: { sM: 'M' },
    });
    expect(lines[0].issues).toEqual([
      'Coloris « Noir » à associer',
      'Taille « L » à associer',
    ]);
    expect(linesFromMapping(draft, null)[0].issues).toEqual([
      'Choisissez le produit Master Print',
    ]);
  });
  it('ligne au m² : dimensions gardées, options communes appliquées', () => {
    const dim: MpDraftLine = {
      key: 'dim-1',
      pegColor: null,
      pegSizes: [],
      config: {
        product_id: '',
        quantity: 2,
        width_mm: 600,
        height_mm: 800,
        options: {},
      },
      issues: [],
    };
    const [l] = linesFromMapping(
      [dim],
      { ...mapping, productId: 'panneau-akilux-35mm-libre' },
      { print_sides: 'print_recto' }
    );
    expect(l.config).toMatchObject({
      product_id: 'panneau-akilux-35mm-libre',
      quantity: 2,
      width_mm: 600,
      height_mm: 800,
      options: { print_sides: 'print_recto' },
    });
  });
});

describe('contrôles avant envoi', () => {
  it('ligne saisie à la main : produit, coloris, quantités, format, options requises', () => {
    expect(manualLineIssues({ product_id: '', options: {} }, null)).toEqual([
      'Choisissez le produit Master Print',
    ]);
    expect(
      manualLineIssues({ product_id: tshirt.id, options: {} }, tshirt)
    ).toEqual([
      'Choisissez un coloris',
      'Indiquez au moins une quantité par taille',
    ]);
    expect(
      manualLineIssues(
        { product_id: tshirt.id, options: { color: 'black', sizes: { M: 2 } } },
        tshirt
      )
    ).toEqual([]);
    expect(
      manualLineIssues(
        { product_id: panneau.id, quantity: 3, options: {} },
        panneau
      )
    ).toEqual([
      'Choisissez un format ou des dimensions',
      'Option « Impression » à choisir',
    ]);
    expect(
      manualLineIssues(
        {
          product_id: panneau.id,
          quantity: 3,
          width_mm: 600,
          height_mm: 800,
          options: { print_sides: 'print_recto' },
        },
        panneau
      )
    ).toEqual([]);
  });
  it('marquages : emplacement, taille, doublon, limite de l’emplacement', () => {
    expect(
      markingIssues(
        [{ position: 'chest_left', technique: 'dtf', format: 'a4' }],
        tshirt
      )
    ).toEqual([]);
    expect(markingIssues([{ position: '', technique: 'dtf' }], tshirt)).toEqual(
      ['Emplacement de marquage à choisir']
    );
    expect(
      markingIssues([{ position: 'back', technique: 'dtf' }], tshirt)
    ).toEqual(['Choisissez un format ou une largeur pour chaque marquage']);
    expect(
      markingIssues(
        [
          { position: 'back', technique: 'dtf', format: 'a4' },
          { position: 'back', technique: 'dtf', format: 'a4' },
        ],
        tshirt
      )
    ).toEqual(['Deux marquages au même emplacement']);
    expect(
      markingIssues(
        [{ position: 'chest_left', technique: 'dtf', width_mm: 150 }],
        tshirt
      )
    ).toEqual(['Cœur gauche : 120 mm de large au plus']);
  });
  it('adresse : champs obligatoires, pays à 2 lettres, e-mail', () => {
    expect(
      addressIssues({
        name: 'J',
        street: '1 rue',
        postal_code: '74000',
        city: 'Annecy',
        country: 'FR',
      })
    ).toEqual([]);
    expect(
      addressIssues({
        name: 'J',
        street: '',
        postal_code: '74000',
        city: 'Annecy',
        country: 'France',
      })
    ).toHaveLength(2);
    expect(
      addressIssues({
        name: 'J',
        street: 's',
        postal_code: '1',
        city: 'A',
        country: 'fr',
        email: 'non',
      })
    ).toEqual(['E-mail de livraison invalide']);
  });
  it('options par défaut et options requises', () => {
    expect(optionDefaults(panneau)).toEqual({ print_sides: 'print_recto' });
    expect(optionIssues(panneau, {})).toEqual([
      'Option « Impression » à choisir',
    ]);
    expect(optionIssues(panneau, { print_sides: 'print_rv' })).toEqual([]);
  });
});

describe('fichiers', () => {
  it('un emplacement par marquage, une seule fois ; fichier principal hors textile', () => {
    const lines = linesFromMapping(draft, {
      ...mapping,
      markings: [
        ...mapping.markings,
        { position: 'back', technique: 'dtf', format: 'a4' },
      ],
    }).map((l) => l.config);
    expect(fileSlots(lines)).toEqual(['marking:chest_left', 'marking:back']);
    expect(
      fileSlots([{ product_id: 'panneau', quantity: 1, options: {} }])
    ).toEqual(['main']);
    expect(
      fileSlots([
        {
          product_id: 'x',
          quantity: 1,
          options: { color: 'black', sizes: { M: 1 } },
        },
      ])
    ).toEqual([]);
  });
  it('libellés', () => {
    expect(slotLabel('marking:back', tshirt)).toBe('Marquage — Dos');
    expect(slotLabel('marking:nape', tshirt)).toBe('Marquage — nape');
    expect(slotLabel('main')).toBe('Fichier d’impression');
    expect(slotLabel('piece:2')).toBe('Visuel n° 2');
  });
});

describe('catalogue et correspondance', () => {
  it('tailles vendues dans le coloris', () => {
    expect(sizesForColor(tshirt, 'black')).toEqual(['S', 'M', 'L']);
    expect(sizesForColor(tshirt, 'white')).toEqual(['M', 'L', '2XL']);
    expect(sizesForColor(tshirt, undefined)).toEqual(['S', 'M', 'L', '2XL']);
  });
  it('correspondance mémorisée : associations et marquages complets seulement', () => {
    expect(
      mappingToSave({
        productId: 'p',
        colors: { a: 'black', b: '' },
        sizes: { s: 'M' },
        markings: [
          { position: 'back', technique: 'dtf', format: 'a4' },
          { position: '', technique: 'dtf' },
        ],
      })
    ).toEqual({
      productId: 'p',
      productName: undefined,
      colors: { a: 'black' },
      sizes: { s: 'M' },
      markings: [{ position: 'back', technique: 'dtf', format: 'a4' }],
    });
  });
});

describe('commandes', () => {
  it('annulation proposée tant que la commande n’est pas partie', () => {
    expect(canCancel('awaiting_files')).toBe(true);
    expect(canCancel('in_production')).toBe(true);
    expect(canCancel('shipped')).toBe(false);
    expect(canCancel('cancelled')).toBe(false);
  });
  it('étape suivante en bac à sable', () => {
    expect(nextSimulateEvents('in_production')).toEqual(['shipped']);
    expect(nextSimulateEvents('shipped')).toEqual(['delivered']);
    expect(nextSimulateEvents('awaiting_files')).toEqual([]);
  });
  it('marge', () => {
    expect(margin(250, 87.86)).toEqual({ amount: 162.14, rate: 64.9 });
    expect(margin(null, 10)).toBeNull();
    expect(margin(100, 0)).toBeNull();
  });
});

describe('clé d’envoi', () => {
  it('gardée si l’envoi a pu aboutir, renouvelée après un refus net', () => {
    expect(nextIdempotencyKey('cle-identique-1234', undefined)).toBe(
      'cle-identique-1234'
    );
    expect(nextIdempotencyKey('cle-identique-1234', 502)).toBe(
      'cle-identique-1234'
    );
    expect(nextIdempotencyKey('cle-identique-1234', 503)).toBe(
      'cle-identique-1234'
    );
    const next = nextIdempotencyKey('cle-identique-1234', 422);
    expect(next).not.toBe('cle-identique-1234');
    expect(next).toMatch(/^[A-Za-z0-9-]{16,80}$/);
  });
});

describe('erreurs du serveur', () => {
  it('message du module, et route absente ≠ projet introuvable', () => {
    expect(
      masterPrintError(
        { response: { data: { error: 'Produit inexistant.' } } },
        'x'
      )
    ).toBe('Produit inexistant.');
    expect(masterPrintError(new Error('réseau'), 'Repli')).toBe('Repli');
    expect(
      isMasterPrintMissing({
        response: {
          status: 404,
          data: { data: null, error: { status: 404, name: 'NotFoundError' } },
        },
      })
    ).toBe(true);
    expect(isMasterPrintMissing({ response: { status: 405, data: {} } })).toBe(
      true
    );
    expect(
      isMasterPrintMissing({
        response: { status: 404, data: { error: 'Projet introuvable.' } },
      })
    ).toBe(false);
    expect(
      isMasterPrintMissing({
        response: {
          status: 502,
          data: { error: 'Master Print refuse l’accès' },
        },
      })
    ).toBe(false);
  });
});
