/**
 * Normalisation de noms pour la correspondance d'entités par libellé
 * (catégories produit, tailles, couleurs, clients…) dans les imports et
 * le remplissage IA.
 *
 * Règle : insensible à la casse, aux ACCENTS et aux espaces surnuméraires.
 * « Vêtement  Haute-Visibilité » ≡ « vetement haute-visibilite ».
 *
 * Sans ça, « Vêtement » ≠ « Vetement » → catégorie non trouvée → produit créé
 * SANS catégorie (invisible côté client) ou catégorie DOUBLON créée à l'import.
 */
export function normalizeName(s?: string | null): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Deux libellés désignent-ils la même entité ? */
export function sameName(a?: string | null, b?: string | null): boolean {
  const na = normalizeName(a);
  return na !== '' && na === normalizeName(b);
}
