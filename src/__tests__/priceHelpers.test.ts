/**
 * Tests unitaires — calculs de TVA et formatage de prix.
 *
 * Le masquage GLOBAL des prix a été retiré (25/09/2026) : seul le tableau de
 * bord admin masque ses chiffres (dashboardFigures.test.ts). On garde les
 * stubs navigateur pour vérifier que l'ancien réglage n'a plus d'effet.
 */

import {
  TVA_RATE,
  toTTC,
  toHT,
  tvaAmount,
  fmtNum,
  fmtPrice,
  fmtHT,
  fmtTTC,
  fmtEur,
} from '@/utils/priceHelpers';

// ── Stubs navigateur (localStorage + window.dispatchEvent/Event) ──
beforeEach(() => {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  (global as any).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  (global as any).window = { dispatchEvent: jest.fn() };
});

describe('Calculs TVA (20 %)', () => {
  test('taux de TVA = 0.2', () => {
    expect(TVA_RATE).toBe(0.2);
  });

  test('HT vers TTC', () => {
    expect(toTTC(100)).toBe(120);
    expect(toTTC(19.99)).toBe(23.99); // 19.99 x 1.2 = 23.988 -> 23.99
  });

  test('TTC vers HT', () => {
    expect(toHT(120)).toBe(100);
  });

  test('montant de TVA sur un HT', () => {
    expect(tvaAmount(100)).toBe(20);
    expect(tvaAmount(33.33)).toBe(6.67); // 6.666 -> 6.67
  });

  test('aller-retour HT vers TTC vers HT reste coherent', () => {
    expect(toHT(toTTC(250))).toBe(250);
  });
});

describe('Formatage numerique (locale FR)', () => {
  test('virgule comme separateur decimal, 2 decimales par defaut', () => {
    // La virgule decimale FR est stable ; le separateur de milliers depend de
    // l'ICU de Node, on ne teste donc que la partie decimale.
    expect(fmtNum(1234.5)).toMatch(/,50$/);
    expect(fmtNum(9.9)).toBe('9,90');
  });

  test('respecte le nombre de decimales demande', () => {
    expect(fmtNum(10, 0)).toBe('10');
  });
});

describe('Formatage prix — affichage normal', () => {
  test('fmtPrice ajoute le symbole euro', () => {
    expect(fmtPrice(50)).toContain('€');
    expect(fmtPrice(50)).toContain('50,00');
  });

  test('fmtHT suffixe « € HT »', () => {
    expect(fmtHT(50)).toContain('€ HT');
  });

  test('fmtTTC suffixe « € TTC »', () => {
    expect(fmtTTC(50)).toContain('€ TTC');
  });

  test('fmtEur formate en devise sans decimales', () => {
    const out = fmtEur(1500);
    expect(out).toContain('€');
    expect(out).not.toContain(',00');
  });
});

describe('Aucun masquage global des prix', () => {
  // L'œil du tableau de bord posait `peg:hidePrices`, lu par tous les
  // formateurs : les prix disparaissaient dans toute l'application.
  test("l'ancien réglage global n'a plus aucun effet", () => {
    localStorage.setItem('peg:hidePrices', '1');
    expect(fmtPrice(50)).not.toBe('•••••');
    expect(fmtHT(50)).toContain('HT');
    expect(fmtTTC(50)).toContain('TTC');
    expect(fmtEur(50)).toContain('€');
  });
});
