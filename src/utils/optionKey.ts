/**
 * Identité d'une taille ou d'une couleur de produit.
 *
 * Le `value` n'est PAS unique : c'est le code hex d'une couleur (ou le libellé
 * d'une taille). En production, « NOIR » et « HEATHER GREY » du Bonnet portent
 * tous deux #000000 : comparées par `value`, les deux couleurs se confondaient
 * sur la fiche (deux sélecteurs « Taille unique » affichés ensemble, quantité
 * partagée, pré-remplissage du chat impossible). On compare donc par
 * `documentId` quand les DEUX options en ont un, sinon par `value` ET `name`
 * (DEFAULT_CHOICE, sélections m² `{}` et lignes de panier créées avant que la
 * fiche ne demande les documentId n'en ont pas).
 */
type Option = { documentId?: string; value?: string; name?: string } | null | undefined;

/** Clé stable (React key, onglet, regroupement) d'une option. */
export const optionKey = (o: Option): string =>
  o?.documentId || (o?.value || o?.name ? `${o?.value ?? ''}|${o?.name ?? ''}` : 'DEFAULT');

/** Même option ? (documentId si les deux en ont un, sinon valeur + nom). */
export const sameOption = (a: Option, b: Option): boolean => {
  if (!a || !b) return !a && !b;
  if (a.documentId && b.documentId) return a.documentId === b.documentId;
  if ((a.value ?? '') !== (b.value ?? '')) return false;
  return a.name === undefined || b.name === undefined || a.name === b.name;
};
