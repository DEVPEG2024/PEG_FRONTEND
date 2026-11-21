/**
 * Master Print — devis d'achat (prix bloqué 15 jours) et catégories du catalogue :
 * ce que l'admin lit à l'écran.
 */
import type { MpQuoteView } from '@/@types/masterPrintQuote';
import {
  canLockPrice,
  categoryEntries,
  categoryLabel,
  fmtDayMonth,
  pickImportCategory,
  priceChangeAmounts,
  priceChangeOf,
  quoteDecisionNote,
  quoteLabel,
  sendQuoteNote,
} from '@/utils/masterPrintQuote';
import { MP_CATEGORY_LABELS } from '@/utils/masterPrint';

const NOW = new Date('2026-11-21T10:00:00+01:00');

const quote = (over: Partial<MpQuoteView> = {}): MpQuoteView => ({
  quoteId: 'Q-2026-000123',
  totalExclTax: 152.4,
  totalInclTax: 182.88,
  validUntil: '2026-12-05T10:00:00+01:00',
  expired: false,
  used: false,
  orderId: null,
  createdAt: '2026-11-20T10:00:00+01:00',
  linesCount: 1,
  ...over,
});

// Espaces fines insécables de toLocaleString : comparées comme des espaces simples.
const flat = (s: string | null) => (s ?? '').replace(/[\u202f\u00a0]/g, ' ');

describe('devis d’achat — libellés', () => {
  test('libellé attendu : numéro, total HT, validité', () => {
    expect(flat(quoteLabel(quote(), NOW))).toBe(
      'Devis Q-2026-000123 · 152,40 € HT · valable jusqu’au 5 décembre'
    );
  });

  test('date à l’heure de Paris, « 1er », année si autre année', () => {
    // 23 h 30 UTC le 30 novembre = 0 h 30 le 1er décembre à Paris
    expect(fmtDayMonth('2026-11-30T23:30:00Z', NOW)).toBe('1er décembre');
    expect(fmtDayMonth('2027-01-03T10:00:00+01:00', NOW)).toBe(
      '3 janvier 2027'
    );
    expect(fmtDayMonth(null, NOW)).toBe('—');
    expect(fmtDayMonth('n’importe quoi', NOW)).toBe('—');
  });

  test('devis expiré ou déjà utilisé', () => {
    expect(flat(quoteLabel(quote({ expired: true }), NOW))).toContain(
      'expiré le 5 décembre'
    );
    expect(
      quoteLabel(quote({ used: true, orderId: 'MP-ORD-2026-001400' }), NOW)
    ).toContain('utilisé pour la commande MP-ORD-2026-001400');
  });
});

describe('devis d’achat — ce que fera l’envoi', () => {
  test('pas de devis : rien à dire, bouton proposé', () => {
    const check = {
      quote: null,
      decision: { use: false as const, quoteId: null, reason: 'none' as const },
    };
    expect(quoteDecisionNote(check)).toBeNull();
    expect(canLockPrice(check)).toBe(true);
    expect(canLockPrice(null)).toBe(true);
  });

  test('mêmes lignes : prix repris, pas de bouton', () => {
    const check = {
      quote: quote(),
      decision: {
        use: true as const,
        quoteId: 'Q-2026-000123',
        reason: null,
      },
    };
    expect(quoteDecisionNote(check)?.tone).toBe('ok');
    expect(canLockPrice(check)).toBe(false);
  });

  test('lignes modifiées, devis expiré, devis utilisé : prix du jour', () => {
    const base = { quote: quote() };
    const note = (reason: 'changed' | 'expired' | 'used') =>
      quoteDecisionNote({
        ...base,
        decision: { use: false, quoteId: 'Q-2026-000123', reason },
      });
    expect(note('changed')).toMatchObject({ tone: 'warn' });
    expect(note('changed')?.text).toContain('prix du jour');
    expect(note('expired')?.text).toContain('Devis expiré');
    expect(note('used')?.tone).toBe('info');
    expect(quoteDecisionNote({ ...base, decision: null })?.text).toContain(
      'Complétez'
    );
  });

  test('succès de l’envoi : « au prix du devis » seulement s’il a servi', () => {
    expect(
      sendQuoteNote({ used: true, quoteId: 'Q-2026-000123', reason: null })
    ).toBe(' au prix du devis Q-2026-000123');
    expect(
      sendQuoteNote({
        used: false,
        quoteId: 'Q-2026-000123',
        reason: 'changed',
      })
    ).toBe('');
    expect(sendQuoteNote(undefined)).toBe('');
  });
});

describe('409 price_changed', () => {
  const err = (status: number, data: unknown) => ({
    response: { status, data },
  });

  test('réponse du serveur → ancien et nouveau total', () => {
    const change = priceChangeOf(
      err(409, {
        error:
          'Le prix d’achat Master Print a changé depuis le devis Q-2026-000123 : 152,40 € → 158,10 € HT.',
        code: 'price_changed',
        details: {
          quoteId: 'Q-2026-000123',
          oldTotalExclTax: 152.4,
          newTotalExclTax: 158.1,
        },
      })
    );
    expect(change).toMatchObject({
      quoteId: 'Q-2026-000123',
      oldTotalExclTax: 152.4,
      newTotalExclTax: 158.1,
    });
    expect(flat(priceChangeAmounts(change!))).toBe('152,40 € → 158,10 € HT');
  });

  test('nouveau total inconnu : message seul', () => {
    const change = priceChangeOf(
      err(409, { error: 'Prix changé.', code: 'price_changed', details: null })
    );
    expect(change?.message).toBe('Prix changé.');
    expect(priceChangeAmounts(change!)).toBeNull();
  });

  test('autres erreurs : pas de bouton « Confirmer le nouveau prix »', () => {
    expect(
      priceChangeOf(err(409, { error: 'x', code: 'credit_limit_exceeded' }))
    ).toBeNull();
    expect(priceChangeOf(err(422, { code: 'price_changed' }))).toBeNull();
    expect(priceChangeOf(new Error('réseau'))).toBeNull();
  });
});

describe('catégories du catalogue', () => {
  const api = [
    { code: 'large-format', label: 'Impression grand format', products: 11 },
    { code: 'textile', label: 'Textile', products: 2305 },
  ];

  test('libellés de Master Print, sinon la liste connue', () => {
    expect(categoryEntries(api, MP_CATEGORY_LABELS)).toBe(api);
    expect(
      categoryEntries(null, MP_CATEGORY_LABELS).map((c) => c.code)
    ).toEqual(Object.keys(MP_CATEGORY_LABELS));
    expect(categoryLabel(api, 'large-format', MP_CATEGORY_LABELS)).toBe(
      'Impression grand format'
    );
    expect(categoryLabel(api, 'stickers', MP_CATEGORY_LABELS)).toBe(
      'Adhésifs et stickers'
    );
    expect(categoryLabel([], 'nouveau', MP_CATEGORY_LABELS)).toBe('nouveau');
  });

  test('rangement à l’import : dernier choix s’il existe encore', () => {
    const peg = [{ documentId: 'cat1' }, { documentId: 'cat2' }];
    expect(pickImportCategory(peg, 'cat2', 'cat1')).toBe('cat2');
    expect(pickImportCategory(peg, 'supprimee', 'cat1')).toBe('cat1');
    expect(pickImportCategory(peg, undefined, '')).toBe('');
  });
});
