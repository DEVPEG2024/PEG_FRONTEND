/*
 * Tailles et couleurs d'un produit : ce que l'admin VOIT doit être ce que le
 * client voit (signalé par Nova le 25/09/2026, cartes de visite Icart).
 *
 * Le sélecteur ne proposait que les tailles/couleurs de la catégorie du
 * produit. Une valeur déjà rattachée mais hors de cette catégorie (produit
 * changé de catégorie, dupliqué, rempli par l'IA…) n'y apparaissait pas — et
 * restait pourtant rattachée, ré-enregistrée à chaque sauvegarde, proposée au
 * client. Invisible, elle ne pouvait même pas être retirée.
 *
 * On ne la retire PAS d'office : 91 tailles et 43 couleurs étaient dans ce cas
 * en production, souvent voulues (S à 4XL d'un t-shirt dont la catégorie n'a
 * pas ces tailles). On l'affiche, marquée « hors catégorie », pour que l'admin
 * décide.
 */

export type Option = { value: string; label: string };

export const OUTSIDE_CATEGORY_SUFFIX = ' · hors catégorie';

/**
 * Options du sélecteur : celles de la catégorie, plus chaque valeur
 * sélectionnée qui n'y est pas (nom retrouvé dans `known`, sinon `fallback`).
 */
export function withAttachedOutsideCategory(
  categoryOptions: Option[],
  known: Option[],
  selected: string[] | null | undefined,
  fallback: string
): { options: Option[]; outside: Option[] } {
  const inCategory = new Set(categoryOptions.map((o) => o.value));
  const outside = (selected ?? [])
    .filter((id) => !inCategory.has(id))
    .map((id) => ({
      value: id,
      label:
        (known.find((k) => k.value === id)?.label ?? fallback) +
        OUTSIDE_CATEGORY_SUFFIX,
    }));
  return { options: [...categoryOptions, ...outside], outside };
}

/** Registre des noms déjà rencontrés (produit chargé, listes de catégories). */
export const rememberOptions =
  (list: Option[]) =>
  (previous: Option[]): Option[] => {
    const byId = new Map(previous.map((o) => [o.value, o]));
    list.forEach((o) => byId.set(o.value, o));
    return [...byId.values()];
  };
