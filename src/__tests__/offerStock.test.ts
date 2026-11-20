/**
 * Stock du textile d'une offre configurable — règles pures (src/utils/offerStock.ts).
 *   npx jest src/__tests__/offerStock.test.ts
 * Quantités tirées du bac à sable (20/11/2026) : B&C TM057 noir, S = 15, XL épuisée.
 */
import type { OfferSpec } from '@/@types/masterPrint';
import type { OfferStock } from '@/@types/offerStock';
import {
  colorChoices,
  colorSoldOut,
  displayedSizes,
  firstAvailableColor,
  sizeNote,
  sizeState,
  stockBlocker,
  stockColor,
} from '@/utils/offerStock';

const spec: OfferSpec = {
  kind: 'textile',
  name: 'T-shirt',
  description: null,
  quantity: { min: 1, max: null, step: 1 },
  productionDays: 7,
  colors: [
    // Le formulaire ne propose que les tailles disponibles.
    {
      code: 'black',
      label: 'Noir',
      hex: '#000',
      sizes: ['S', 'M', 'L', '2XL'],
    },
    { code: 'white', label: 'Blanc', hex: '#fff', sizes: ['S', 'M', 'L'] },
    { code: 'navy', label: 'Marine', hex: '#001', sizes: ['M'] },
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  markings: null,
  options: [],
  fixedOptions: [],
  format: null,
  pieces: null,
  ready: true,
};

const stock: OfferStock = {
  tracked: true,
  updatedAt: '2026-11-21T00:00:00+01:00',
  lowThreshold: 20,
  colors: [
    {
      code: 'black',
      label: 'Noir',
      hex: '#000',
      soldOut: false,
      sizes: { S: 15, M: 79, L: 155, XL: 0, '2XL': 20, '3XL': 0 },
      immediate: {},
    },
    {
      code: 'white',
      label: 'Blanc',
      hex: '#fff',
      soldOut: false,
      sizes: { S: 51, M: 8, L: null },
      immediate: { M: 3 },
    },
    // Fiche relue il y a peu : encore proposé, mais plus rien en stock.
    {
      code: 'navy',
      label: 'Marine',
      hex: '#001',
      soldOut: true,
      sizes: { M: 0 },
      immediate: {},
    },
    // Coloris entièrement épuisé, absent du formulaire.
    {
      code: 'steel-grey',
      label: 'Gris acier',
      hex: '#777',
      soldOut: true,
      sizes: { S: 0, M: 0 },
      immediate: {},
    },
  ],
};

describe('état d’une taille', () => {
  it('stock normal, faible, épuisé, non suivi', () => {
    expect(sizeState(spec, stock, 'black', 'L')).toEqual({
      kind: 'ok',
      left: 155,
    });
    expect(sizeState(spec, stock, 'black', 'S')).toEqual({
      kind: 'low',
      left: 15,
    });
    expect(sizeState(spec, stock, 'black', '2XL')).toEqual({
      kind: 'low',
      left: 20,
    });
    expect(sizeState(spec, stock, 'black', 'XL')).toEqual({ kind: 'soldOut' });
    expect(sizeState(spec, stock, 'white', 'L')).toEqual({ kind: 'free' });
  });

  it('taille absente du formulaire mais connue du stock : épuisée', () => {
    expect(
      sizeState(
        spec,
        {
          ...stock,
          colors: [{ ...stock.colors[0], sizes: { XL: 40 } }],
        },
        'black',
        'XL'
      )
    ).toEqual({ kind: 'soldOut' });
  });

  it('stock inconnu : aucune limite', () => {
    expect(sizeState(spec, null, 'black', 'S')).toEqual({ kind: 'free' });
    expect(sizeState(spec, { ...stock, tracked: false }, 'black', 'S')).toEqual(
      { kind: 'free' }
    );
    expect(sizeState(spec, stock, 'black', 'XS')).toEqual({ kind: 'free' });
    expect(stockColor(stock, undefined)).toBeNull();
  });
});

describe('tailles et coloris affichés', () => {
  it('tailles du formulaire + tailles épuisées, dans l’ordre de la fiche', () => {
    expect(displayedSizes(spec, stock, 'black')).toEqual([
      'S',
      'M',
      'L',
      'XL',
      '2XL',
      '3XL',
    ]);
    expect(displayedSizes(spec, null, 'black')).toEqual(['S', 'M', 'L', '2XL']);
    expect(displayedSizes(spec, null, undefined)).toEqual(spec.sizes);
  });

  it('coloris épuisés grisés, y compris hors formulaire', () => {
    const choices = colorChoices(spec, stock);
    expect(choices.map((c) => [c.code, c.soldOut])).toEqual([
      ['black', false],
      ['white', false],
      ['navy', true],
      ['steel-grey', true],
    ]);
    expect(choices.find((c) => c.code === 'steel-grey')?.sizes).toEqual([]);
    expect(colorSoldOut(spec, stock, 'navy')).toBe(true);
    expect(colorSoldOut(spec, stock, 'black')).toBe(false);
  });

  it('sans stock : les coloris du formulaire, tels quels', () => {
    expect(colorChoices(spec, null).map((c) => c.code)).toEqual([
      'black',
      'white',
      'navy',
    ]);
    expect(colorChoices(spec, null).every((c) => !c.soldOut)).toBe(true);
  });
});

describe('quantités au-delà du stock', () => {
  it('message pour le client et ajout au panier bloqué', () => {
    expect(
      stockBlocker(spec, stock, { color: 'black', sizes: { S: 16, M: 10 } })
    ).toBe('Il ne reste que 15 pièces en S (Noir).');
    expect(
      stockBlocker(spec, stock, { color: 'black', sizes: { S: 15, L: 155 } })
    ).toBeNull();
    expect(
      stockBlocker(spec, stock, { color: 'black', sizes: { XL: 1, S: 0 } })
    ).toBe('La taille XL (Noir) est épuisée.');
    expect(stockBlocker(spec, stock, { color: 'navy', sizes: { M: 2 } })).toBe(
      'Le coloris Marine est épuisé : choisissez-en un autre.'
    );
  });

  it('non suivi, stock inconnu, autre produit : rien de bloqué', () => {
    expect(
      stockBlocker(spec, stock, { color: 'white', sizes: { L: 9999 } })
    ).toBeNull();
    expect(
      stockBlocker(spec, null, { color: 'black', sizes: { S: 999 } })
    ).toBeNull();
    expect(
      stockBlocker({ ...spec, kind: 'unit' }, stock, {
        color: 'black',
        sizes: { S: 999 },
      })
    ).toBeNull();
  });

  it('une seule pièce restante', () => {
    const one: OfferStock = {
      ...stock,
      colors: [{ ...stock.colors[0], sizes: { S: 1 } }],
    };
    expect(stockBlocker(spec, one, { color: 'black', sizes: { S: 2 } })).toBe(
      'Il ne reste qu’une pièce en S (Noir).'
    );
  });
});

describe('note sous une taille', () => {
  const note = (color: string, size: string, qty: number) =>
    sizeNote(stock, color, size, sizeState(spec, stock, color, size), qty);

  it('plus que N, au-delà, épuisée saisie, délai plus long', () => {
    expect(note('black', 'S', 0)).toEqual({
      tone: 'warn',
      text: 'Plus que 15',
    });
    expect(note('black', 'S', 16)).toEqual({
      tone: 'error',
      text: 'Il n’en reste que 15',
    });
    expect(note('black', 'XL', 2)).toEqual({
      tone: 'error',
      text: 'Épuisée : retirez-la',
    });
    expect(note('black', 'XL', 0)).toBeNull();
    expect(note('black', 'L', 10)).toBeNull();
    expect(note('white', 'M', 5)).toEqual({
      tone: 'info',
      text: 'Au-delà de 3, délai d’environ une semaine de plus',
    });
    expect(note('white', 'L', 500)).toBeNull();
  });

  it('marque blanche : aucun nom de fournisseur', () => {
    const texts = [
      note('black', 'S', 16)?.text,
      note('white', 'M', 5)?.text,
      stockBlocker(spec, stock, { color: 'black', sizes: { S: 99, XL: 1 } }),
    ].join(' ');
    expect(texts).not.toMatch(/master|print|imbretex|fournisseur|MP-/i);
  });
});

describe('coloris de départ', () => {
  it('épuisé et rien saisi : premier coloris disponible', () => {
    expect(firstAvailableColor(spec, stock, { color: 'navy', sizes: {} })).toBe(
      'black'
    );
  });

  it('quantités déjà saisies, coloris disponible ou stock inconnu : on ne touche à rien', () => {
    expect(
      firstAvailableColor(spec, stock, { color: 'navy', sizes: { M: 2 } })
    ).toBeNull();
    expect(
      firstAvailableColor(spec, stock, { color: 'black', sizes: {} })
    ).toBeNull();
    expect(
      firstAvailableColor(spec, null, { color: 'navy', sizes: {} })
    ).toBeNull();
  });
});
