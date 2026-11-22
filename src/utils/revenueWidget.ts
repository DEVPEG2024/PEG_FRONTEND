/**
 * Widget « Chiffre d'affaires » de l'accueil admin (refonte du 22/11/2026) —
 * règles pures, testées : src/__tests__/revenueWidget.test.ts. Composant :
 * views/app/admin/home/RevenueWidget.tsx. Les montants mensuels viennent de
 * DashboardAdmin (24 mois, mêmes calculs que le reste de l'accueil).
 */

export type RevMonth = {
  /** « 2026-11 ». */
  key: string;
  ca: number;
  marge: number;
  paid: number;
  depenses: number;
};

export type RevPeriod = 6 | 12;
export type RevKey = 'ca' | 'marge' | 'paid' | 'depenses';
export type RevTotals = Record<RevKey, number>;

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « nov. » ; « janv. 26 » au passage d'année (axe). */
export function axisLabel(key: string, index: number): string {
  const m = Number(key.slice(5, 7));
  const name = MONTHS_SHORT[m - 1] ?? key;
  return m === 1 && index > 0 ? `${name} ${key.slice(2, 4)}` : name;
}

/** « novembre 2026 ». */
export const longLabel = (key: string) =>
  `${MONTHS_LONG[Number(key.slice(5, 7)) - 1] ?? key} ${key.slice(0, 4)}`;

/** Période affichée (les N derniers mois) et la précédente, si les données la couvrent. */
export function periodView(
  months: RevMonth[],
  period: RevPeriod
): { current: RevMonth[]; previous: RevMonth[] | null } {
  const current = months.slice(-period);
  const prevSlice = months.slice(-2 * period, -period);
  return { current, previous: prevSlice.length === period ? prevSlice : null };
}

export function totals(months: RevMonth[]): RevTotals {
  const t: RevTotals = { ca: 0, marge: 0, paid: 0, depenses: 0 };
  for (const m of months) {
    t.ca += m.ca || 0;
    t.marge += m.marge || 0;
    t.paid += m.paid || 0;
    t.depenses += m.depenses || 0;
  }
  return t;
}

/** Variation en % ; null si la période précédente est vide. */
export function deltaPct(
  current: number,
  previous: number | null | undefined
): number | null {
  if (previous == null || !(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Part en % (arrondie) ; null sans base. */
export const ratePct = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

/** Meilleur mois (CA le plus haut), null si aucun CA. */
export function bestMonth(months: RevMonth[]): RevMonth | null {
  let best: RevMonth | null = null;
  for (const m of months) if (m.ca > 0 && (!best || m.ca > best.ca)) best = m;
  return best;
}

/** Moyenne mensuelle sur la période (mois vides compris). */
export const monthlyAverage = (months: RevMonth[], key: RevKey = 'ca') =>
  months.length
    ? months.reduce((a, m) => a + (m[key] || 0), 0) / months.length
    : 0;

/**
 * Courbe lissée sans dépassement (interpolation cubique monotone de
 * Fritsch-Carlson) : la courbe ne passe jamais sous 0 ni au-dessus d'un sommet.
 */
export function monotonePath(points: Array<[number, number]>): string {
  const n = points.length;
  if (!n) return '';
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;
  const r = (v: number) => Math.round(v * 100) / 100;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push(dx[i] ? (points[i + 1][1] - points[i][1]) / dx[i] : 0);
  }
  const t: number[] = new Array(n);
  t[0] = slope[0];
  t[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1)
    t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / slope[i];
    const b = t[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * slope[i];
      t[i + 1] = k * b * slope[i];
    }
  }
  let d = `M${r(points[0][0])},${r(points[0][1])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${r(x0 + h)},${r(y0 + t[i] * h)} ${r(x1 - h)},${r(y1 - t[i + 1] * h)} ${r(x1)},${r(y1)}`;
  }
  return d;
}

/** Index du mois le plus proche d'une position horizontale (0 → 1) sur la zone tracée. */
export function nearestIndex(ratio: number, count: number): number {
  if (count <= 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
}
