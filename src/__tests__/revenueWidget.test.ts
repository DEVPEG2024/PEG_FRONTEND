/**
 * Widget « Chiffre d'affaires » — règles pures (src/utils/revenueWidget.ts).
 *   npx jest src/__tests__/revenueWidget.test.ts
 */
import {
  type RevMonth,
  axisLabel,
  bestMonth,
  deltaPct,
  longLabel,
  monotonePath,
  monthlyAverage,
  nearestIndex,
  periodView,
  ratePct,
  totals,
} from '@/utils/revenueWidget';

const month = (
  key: string,
  ca = 0,
  extra: Partial<RevMonth> = {}
): RevMonth => ({
  key,
  ca,
  marge: 0,
  paid: 0,
  depenses: 0,
  ...extra,
});

const year = (from: number, n: number, values: number[]) =>
  Array.from({ length: n }, (_, i) => {
    const m = ((from - 1 + i) % 12) + 1;
    const y = 2025 + Math.floor((from - 1 + i) / 12);
    return month(`${y}-${String(m).padStart(2, '0')}`, values[i] ?? 0);
  });

describe('période', () => {
  const months = year(
    12,
    24,
    Array.from({ length: 24 }, (_, i) => i + 1)
  ); // déc. 2025 → nov. 2027

  it('six derniers mois et les six précédents', () => {
    const v = periodView(months, 6);
    expect(v.current.map((m) => m.ca)).toEqual([19, 20, 21, 22, 23, 24]);
    expect(v.previous?.map((m) => m.ca)).toEqual([13, 14, 15, 16, 17, 18]);
  });

  it('douze mois et les douze précédents ; pas de précédent sans données', () => {
    expect(periodView(months, 12).previous?.length).toBe(12);
    expect(periodView(months.slice(-12), 12).previous).toBeNull();
  });
});

describe('chiffres', () => {
  it('totaux, variation, parts', () => {
    const t = totals([
      month('2026-10', 100, { marge: 30, paid: 80, depenses: 10 }),
      month('2026-11', 200, { marge: 70, paid: 120 }),
    ]);
    expect(t).toEqual({ ca: 300, marge: 100, paid: 200, depenses: 10 });
    expect(deltaPct(300, 200)).toBe(50);
    expect(deltaPct(300, 0)).toBeNull();
    expect(deltaPct(300, null)).toBeNull();
    expect(ratePct(100, 300)).toBe(33);
    expect(ratePct(5, 0)).toBeNull();
  });

  it('meilleur mois et moyenne mensuelle (mois vides compris)', () => {
    const ms = [
      month('2026-09', 0),
      month('2026-10', 500),
      month('2026-11', 300),
    ];
    expect(bestMonth(ms)?.key).toBe('2026-10');
    expect(bestMonth([month('2026-11', 0)])).toBeNull();
    expect(monthlyAverage(ms)).toBeCloseTo(266.67, 1);
    expect(monthlyAverage([])).toBe(0);
  });
});

describe('libellés', () => {
  it('axe : mois court, année au passage de janvier', () => {
    expect(axisLabel('2026-11', 3)).toBe('nov.');
    expect(axisLabel('2027-01', 4)).toBe('janv. 27');
    expect(axisLabel('2027-01', 0)).toBe('janv.');
    expect(longLabel('2026-08')).toBe('août 2026');
  });
});

describe('courbe lissée', () => {
  it('passe par chaque point sans dépasser les sommets', () => {
    const pts: Array<[number, number]> = [
      [0, 100],
      [50, 20],
      [100, 20],
      [150, 80],
    ];
    const d = monotonePath(pts);
    expect(d.startsWith('M0,100')).toBe(true);
    expect(d).toContain(' 50,20');
    expect(d).toContain(' 150,80');
    // Palier plat (20 → 20) : points de contrôle à la même hauteur, pas de creux sous 20.
    expect(d).toContain('C66.67,20 83.33,20 100,20');
  });

  it('cas limites', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([[5, 5]])).toBe('M5,5');
  });

  it('mois le plus proche du pointeur', () => {
    expect(nearestIndex(0, 6)).toBe(0);
    expect(nearestIndex(0.49, 6)).toBe(2);
    expect(nearestIndex(1, 6)).toBe(5);
    expect(nearestIndex(1.4, 6)).toBe(5);
    expect(nearestIndex(0.5, 1)).toBe(0);
  });
});
