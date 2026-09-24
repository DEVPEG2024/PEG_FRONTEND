// Résolution de la vue affichée par « Mes offres » (/customer/products).
// Fonction pure, testée dans src/__tests__/offersView.test.ts.

export type OffersView =
  | 'noCustomer'
  | 'loading'
  | 'error'
  | 'noResult'
  | 'list'
  | 'noCatalogue'
  | 'standard'
  | 'preparing'
  | 'premium'
  | 'unknown';

export type ResolveOffersViewInput = {
  hasCustomer: boolean;
  loading: boolean;
  contextLoaded: boolean;
  error: boolean;
  searchTerm: string;
  total: number;
  catalogAccess?: boolean | null;
  premium?: boolean | null;
  premiumProcessed?: boolean | null;
  premiumSince?: string | null;
};

/** Vues « vides » qui affichent une sélection du catalogue (si catalogAccess !== false). */
export const EMPTY_VIEWS_WITH_SELECTION: OffersView[] = [
  'standard',
  'preparing',
  'premium',
  'unknown',
];

/**
 * « Mes offres » est réservé aux clients Premium (décision du 24/09/2026).
 * Exception : un client SANS accès au catalogue ne commande qu'à partir des
 * offres préparées par PEG (le bouton « Commander » du tableau de bord l'envoie
 * ici) — on ne les lui retire jamais, Premium ou non.
 * Statut inconnu (null/undefined) : on n'empêche rien (jamais masquer les
 * offres d'un client qui paie parce qu'une requête a échoué).
 */
export function isOffersReserved(
  premium?: boolean | null,
  catalogAccess?: boolean | null
): boolean {
  return premium === false && catalogAccess !== false;
}

export function resolveOffersView({
  hasCustomer,
  loading,
  contextLoaded,
  error,
  searchTerm,
  total,
  catalogAccess,
  premium,
  premiumProcessed,
  premiumSince,
}: ResolveOffersViewInput): OffersView {
  if (!hasCustomer) return 'noCustomer';
  // Le vide n'apparaît jamais avant la fin du contexte ET des produits.
  if (!contextLoaded) return 'loading';
  // Client Standard : présentation de Premium, jamais la liste des offres
  // (aucune requête produits n'est d'ailleurs envoyée).
  if (isOffersReserved(premium, catalogAccess)) return 'standard';
  if (loading) return 'loading';
  if (error) return 'error';
  if (total === 0 && searchTerm.trim() !== '') return 'noResult';
  if (total > 0) return 'list';
  if (catalogAccess === false) return 'noCatalogue';
  if (typeof premium !== 'boolean') return 'unknown';
  // `premiumSince` n'est posé QUE par le webhook Stripe : la migration
  // premium_defaults a passé les anciens clients en premium sans date, et leur
  // `premiumProcessed` n'est pas fiable → ils ne sont pas « en préparation ».
  if (premium === true && !!premiumSince && premiumProcessed !== true) {
    return 'preparing';
  }
  return 'premium';
}
