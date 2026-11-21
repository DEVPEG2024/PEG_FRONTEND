/**
 * Prix d'achat Master Print des produits importés — textes de l'écran admin
 * (src/utils/masterPrintPrices.ts).
 *   npx jest src/__tests__/masterPrintPrices.test.ts
 */
import type { MpPriceChange, MpPriceRun } from '@/@types/masterPrintPrices';
import {
  canApply,
  canDecide,
  compareTiers,
  costLine,
  firstTierPrice,
  fmtDateTime,
  fmtVariation,
  priceLine,
  priceStatusTone,
  reasonText,
  runLine,
  splitChanges,
  variationColor,
} from '@/utils/masterPrintPrices';

const nbsp = (s: string) => s.replace(/[  ]/g, ' ');

const change = (over: Partial<MpPriceChange> = {}): MpPriceChange => ({
  id: 1,
  productDocumentId: 'abc123def456',
  productName: 'Panneau Akilux 10 mm',
  productExists: true,
  mpProductId: 'panneau-akilux-10mm',
  oldTiers: [
    { minQuantity: 5, price: 29.14 },
    { minQuantity: 1, price: 37.94 },
  ],
  newTiers: [
    { minQuantity: 1, price: 39.95 },
    { minQuantity: 5, price: 30.59 },
  ],
  oldCost: 23.71,
  newCost: 24.97,
  markup: 60,
  variation: 5.3,
  status: 'a_revoir',
  reason: 'retouche',
  source: 'webhook',
  createdAt: '2026-11-21T01:20:00.000Z',
  updatedAt: null,
  decidedAt: null,
  ...over,
});

const run = (over: Partial<MpPriceRun> = {}): MpPriceRun => ({
  at: '2026-11-21T01:20:00.000Z',
  source: 'nuit',
  scope: 'tous',
  checked: 12,
  unchanged: 9,
  applied: 2,
  review: 1,
  retired: 0,
  skipped: 0,
  errors: 0,
  error: null,
  durationMs: 8000,
  ...over,
});

describe('prix d’achat Master Print', () => {
  it('premier palier = la plus petite quantité', () => {
    expect(firstTierPrice(change().oldTiers)).toBe(37.94);
    expect(firstTierPrice([])).toBeNull();
    expect(firstTierPrice(null)).toBeNull();
  });

  it('variation signée, à la française', () => {
    expect(nbsp(fmtVariation(5.3))).toBe('+5,3 %');
    expect(nbsp(fmtVariation(-3))).toBe('−3,0 %');
    expect(nbsp(fmtVariation(0.01))).toBe('0,0 %');
    expect(fmtVariation(null)).toBe('');
    expect(variationColor(5)).toBe('#fcd34d');
    expect(variationColor(-5)).toBe('#86efac');
  });

  it('ligne de prix : ancien → nouveau premier palier', () => {
    expect(nbsp(priceLine(change()))).toBe(
      '1er palier : 37,94 € → 39,95 € (+5,3 %)'
    );
    expect(nbsp(priceLine(change({ newTiers: null })))).toBe(
      '1er palier : 37,94 € (aucun prix proposé)'
    );
    expect(priceLine(change({ reason: 'retire', newTiers: null }))).toBe(
      'Produit retiré de la vente par Master Print'
    );
  });

  it('prix d’achat affiché seulement s’il a changé', () => {
    expect(nbsp(costLine(change()) || '')).toBe('Achat : 23,71 € → 24,97 €');
    expect(costLine(change({ newCost: 23.71 }))).toBeNull();
    expect(costLine(change({ oldCost: null }))).toBeNull();
  });

  it('raison en une phrase claire', () => {
    expect(reasonText(change())).toContain('rien n’a été écrasé');
    expect(reasonText(change())).toContain('+60 %');
    expect(reasonText(change({ reason: 'auto' }))).toBe(
      'Mis à jour automatiquement, même majoration (+60 %).'
    );
    expect(
      reasonText(change({ reason: 'ancien_import', markup: 62.5 }))
    ).toContain('majoration supposée +62,5 %');
    expect(
      reasonText(change({ reason: 'ancien_import', markup: null }))
    ).toContain('aucun prix ne peut être proposé');
  });

  it('boutons : appliquer seulement avec des paliers proposés', () => {
    expect(canApply(change())).toBe(true);
    expect(canApply(change({ newTiers: null }))).toBe(false);
    expect(canApply(change({ status: 'applique' }))).toBe(false);
    expect(canDecide(change({ newTiers: null }))).toBe(true);
    expect(canDecide(change({ status: 'ignore' }))).toBe(false);
  });

  it('couleur du statut', () => {
    expect(priceStatusTone('a_revoir').color).toBe('#fcd34d');
    expect(priceStatusTone('inconnu')).toEqual(priceStatusTone('ignore'));
  });

  it('bilan de la dernière vérification', () => {
    expect(nbsp(runLine(run()))).toMatch(
      /^Dernière vérification le \d{2}\/\d{2}\/2026 à \d{2}:\d{2} \(vérification de la nuit\) : 12 produits vérifiés, 2 ajustés, 1 à revoir\.$/
    );
    expect(runLine(run({ applied: 0, review: 0 }))).toContain(
      '12 produits vérifiés, aucun changement.'
    );
    expect(runLine(run({ checked: 1, applied: 1, review: 0 }))).toContain(
      '1 produit vérifié, 1 ajusté.'
    );
    expect(runLine(run({ error: 'Master Print indisponible' }))).toContain(
      'Problème : Master Print indisponible'
    );
    expect(runLine(null)).toContain('Pas encore vérifiés');
    expect(fmtDateTime('pas une date')).toBe('');
  });

  it('paliers avant / après, quantité par quantité', () => {
    expect(
      compareTiers(
        [
          { minQuantity: 1, price: 10 },
          { minQuantity: 10, price: 8 },
        ],
        [
          { minQuantity: 1, price: 10.5 },
          { minQuantity: 25, price: 7 },
        ]
      )
    ).toEqual([
      { minQuantity: 1, before: 10, after: 10.5 },
      { minQuantity: 10, before: 8, after: null },
      { minQuantity: 25, before: null, after: 7 },
    ]);
  });

  it('« à revoir » d’abord, puis 5 changements de l’historique', () => {
    const list = [
      change({ id: 1 }),
      ...Array.from({ length: 7 }, (_, i) =>
        change({ id: 10 + i, status: 'applique', reason: 'auto' })
      ),
      change({ id: 2 }),
    ];
    const s = splitChanges(list, false);
    expect(s.pending.map((c) => c.id)).toEqual([1, 2]);
    expect(s.history).toHaveLength(5);
    expect(s.hidden).toBe(2);
    expect(splitChanges(list, true).hidden).toBe(0);
  });
});
