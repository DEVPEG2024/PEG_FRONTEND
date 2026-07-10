/**
 * Tri naturel des tailles, partagé admin/client :
 * lettres (XS < S < M < L < XL < XXL < 3XL…), puis numérique (pointures,
 * grammages…), puis alphabétique. Alias gérés : 2XL = XXL, 3XL = XXXL, etc.
 */

const SIZE_SCALE = [
  'xxxs',
  'xxs',
  'xs',
  's',
  'm',
  'l',
  'xl',
  'xxl',
  'xxxl',
  'xxxxl',
  'xxxxxl',
];

const SIZE_ALIASES: Record<string, string> = {
  '2xs': 'xxs',
  '3xs': 'xxxs',
  '2xl': 'xxl',
  '3xl': 'xxxl',
  '4xl': 'xxxxl',
  '5xl': 'xxxxxl',
};

const sizeRank = (name: string): [number, number | string] => {
  let n = (name || '').trim().toLowerCase();
  n = SIZE_ALIASES[n] ?? n;
  const li = SIZE_SCALE.indexOf(n);
  if (li !== -1) return [0, li];
  const num = parseFloat((name || '').replace(',', '.'));
  if (!isNaN(num) && /^[\d.,\s]+$/.test((name || '').trim())) return [1, num];
  return [2, (name || '').trim().toLowerCase()];
};

export const compareSizeNames = (a: string, b: string): number => {
  const [ga, va] = sizeRank(a);
  const [gb, vb] = sizeRank(b);
  if (ga !== gb) return ga - gb;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb));
};

export const compareSizes = <T extends { name: string }>(
  a: T,
  b: T
): number => compareSizeNames(a.name, b.name);

/** Copie triée (n'altère pas le tableau d'origine). */
export const sortSizes = <T extends { name: string }>(sizes: T[]): T[] =>
  [...sizes].sort(compareSizes);
