/**
 * Tri naturel des tailles, partagé admin/client :
 * âges enfant (6A < 8A < 10A, 3/4 ans…), puis lettres
 * (XXS < XS < S < M < L < XL < XXL < 3XL … 7XL), puis numérique (pointures,
 * grammages…), puis le reste en ordre naturel (A4 < A5, T2 < T10).
 * Alias gérés : 2XL = XXL, 3XS = XXXS…
 *
 * ⚠️ Avant le 22/10/2026, « 6A…14A » tombaient dans l'ordre alphabétique
 * (10A, 12A, 14A, 6A, 8A sur la fiche client) et « 7XL » passait après les
 * pointures.
 */

// Âge enfant : « 6A », « 10 ans », « 3/4 ans », « 12-14A » → premier nombre.
const AGE_RE = /^(\d+(?:[.,]\d+)?)\s*(?:[/-]\s*\d+(?:[.,]\d+)?\s*)?(?:a|ans?)$/i;
// Lettres : M = 0 ; S, XS, XXS / 2XS… en dessous ; L, XL, XXL / 2XL… au-dessus.
const LETTER_RE = /^(?:(\d+)x|(x*))([sml])$/i;

const letterRank = (n: string): number | null => {
  const m = LETTER_RE.exec(n);
  if (!m) return null;
  const [, digits, xs, base] = m;
  const k = digits ? Number(digits) : xs.length;
  if (base === 'm') return k === 0 ? 0 : null; // « XM » n'existe pas
  return base === 's' ? -(1 + k) : 1 + k;
};

const sizeRank = (name: string): [number, number | string] => {
  const raw = (name || '').trim();
  const n = raw.toLowerCase().replace(/\s+/g, '');
  const age = AGE_RE.exec(raw);
  if (age) return [0, parseFloat(age[1].replace(',', '.'))];
  const letter = letterRank(n);
  if (letter !== null) return [1, letter];
  if (/^[\d.,\s]+$/.test(raw) && !isNaN(parseFloat(raw.replace(',', '.')))) {
    return [2, parseFloat(raw.replace(',', '.'))];
  }
  return [3, raw.toLowerCase()];
};

export const compareSizeNames = (a: string, b: string): number => {
  const [ga, va] = sizeRank(a);
  const [gb, vb] = sizeRank(b);
  if (ga !== gb) return ga - gb;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb), 'fr', { numeric: true });
};

export const compareSizes = <T extends { name: string }>(
  a: T,
  b: T
): number => compareSizeNames(a.name, b.name);

/** Copie triée (n'altère pas le tableau d'origine). */
export const sortSizes = <T extends { name: string }>(sizes: T[]): T[] =>
  [...sizes].sort(compareSizes);

/**
 * Lignes « taille × couleur » d'une commande ou du panier : couleurs dans
 * l'ordre où elles apparaissent, tailles dans l'ordre naturel à l'intérieur
 * de chaque couleur (copie, l'original n'est pas modifié). Sans ce tri, la
 * commande gardait l'ordre des clics (12A avant 6A).
 */
export const sortSelections = <T extends { size?: { name?: string } | null; color?: { value?: string; name?: string } | null }>(
  selections: T[]
): T[] => {
  const colorKey = (s: T) => s.color?.value ?? s.color?.name ?? '';
  const colorOrder = new Map<string, number>();
  selections.forEach((s) => {
    if (!colorOrder.has(colorKey(s))) colorOrder.set(colorKey(s), colorOrder.size);
  });
  return [...selections].sort(
    (a, b) =>
      (colorOrder.get(colorKey(a)) ?? 0) - (colorOrder.get(colorKey(b)) ?? 0) ||
      compareSizeNames(a.size?.name ?? '', b.size?.name ?? '')
  );
};
