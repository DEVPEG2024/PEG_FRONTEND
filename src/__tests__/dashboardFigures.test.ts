/**
 * Masquage des chiffres du tableau de bord admin — et de rien d'autre.
 * Environnement Node : stubs localStorage + window minimaux.
 */
import {
  areDashboardFiguresHidden,
  toggleDashboardFiguresHidden,
  DASHBOARD_FIGURES_EVENT,
} from '@/views/app/admin/home/dashboardFigures';

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  (global as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
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

describe('Chiffres du tableau de bord admin', () => {
  test('visibles par défaut', () => {
    expect(areDashboardFiguresHidden()).toBe(false);
  });

  test('le bouton masque puis réaffiche, et prévient la page', () => {
    expect(toggleDashboardFiguresHidden()).toBe(true);
    expect(areDashboardFiguresHidden()).toBe(true);
    expect((global as any).window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: DASHBOARD_FIGURES_EVENT })
    );
    expect(toggleDashboardFiguresHidden()).toBe(false);
    expect(areDashboardFiguresHidden()).toBe(false);
  });

  test("l'ancien réglage global est repris pour le seul tableau de bord, puis effacé", () => {
    store['peg:hidePrices'] = '1';
    expect(areDashboardFiguresHidden()).toBe(true);
    expect(store['peg:hidePrices']).toBeUndefined();
  });

  test("un choix déjà fait sur le tableau de bord prime sur l'ancien réglage", () => {
    store['peg:dashboardFiguresHidden'] = '0';
    store['peg:hidePrices'] = '1';
    expect(areDashboardFiguresHidden()).toBe(false);
    expect(store['peg:hidePrices']).toBeUndefined();
  });
});
