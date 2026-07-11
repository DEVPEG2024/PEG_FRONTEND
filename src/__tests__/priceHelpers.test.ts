/**
 * Tests unitaires — calculs de TVA et formatage de prix.
 *
 * priceHelpers lit `localStorage` (masquage des prix) et émet un événement
 * `window` au toggle. L'environnement de test étant Node, on installe des
 * stubs minimaux avant chaque test.
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
  arePricesHidden,
  togglePricesHidden,
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

describe('Masquage des prix', () => {
  test('prix non masques par defaut', () => {
    expect(arePricesHidden()).toBe(false);
  });

  test('toggle masque puis demasque', () => {
    expect(togglePricesHidden()).toBe(true);
    expect(arePricesHidden()).toBe(true);
    expect(togglePricesHidden()).toBe(false);
    expect(arePricesHidden()).toBe(false);
  });

  test('les formateurs renvoient le placeholder quand masque', () => {
    togglePricesHidden(); // -> masque
    expect(fmtPrice(50)).toBe('•••••');
    expect(fmtHT(50)).toBe('•••••');
    expect(fmtTTC(50)).toBe('•••••');
    expect(fmtEur(50)).toBe('•••••');
  });

  test('le toggle emet un evenement window', () => {
    togglePricesHidden();
    expect((global as any).window.dispatchEvent).toHaveBeenCalled();
  });
});
