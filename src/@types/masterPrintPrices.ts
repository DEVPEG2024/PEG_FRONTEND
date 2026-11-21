/**
 * Master Print — prix des produits importés toujours à jour (ajout 21/11/2026).
 * Réponses des routes admin `/master-print/admin/prices*` (peg_strapi
 * `master-print-prices.service.ts`). Écrans ADMIN seulement.
 */

/** Palier de prix PEG : prix unitaire HT dès `minQuantity` pièces. */
export type MpPriceTier = { minQuantity: number; price: number };

/** appliqué | à revoir | ignoré */
export type MpPriceChangeStatus = 'applique' | 'a_revoir' | 'ignore';

/**
 * auto = mis à jour tout seul ; retouche = paliers modifiés à la main, rien
 * d'écrasé ; ancien_import = importé avant le suivi, majoration supposée ;
 * retire = produit retiré de la vente par Master Print.
 */
export type MpPriceChangeReason =
  | 'auto'
  | 'retouche'
  | 'ancien_import'
  /** Configuration d'achat introuvable (ancien import, options changées) : prix non suivis. */
  | 'config_inconnue'
  | 'retire';

/** webhook = avis de Master Print ; nuit = vérification de la nuit ; admin = bouton. */
export type MpPriceSource = 'webhook' | 'nuit' | 'admin';

export type MpPriceChange = {
  id: number;
  productDocumentId: string;
  productName: string;
  /** Faux : le produit PEG a été supprimé depuis. */
  productExists: boolean;
  mpProductId: string;
  /** Paliers du produit au moment du changement. */
  oldTiers: MpPriceTier[];
  /** Paliers appliqués ou proposés (null : rien à proposer). */
  newTiers: MpPriceTier[] | null;
  /** Prix d'achat du premier palier, avant / après. */
  oldCost: number | null;
  newCost: number | null;
  /** Majoration (%) appliquée ou supposée. */
  markup: number | null;
  /** Variation du premier palier de vente, en %. */
  variation: number | null;
  status: MpPriceChangeStatus | string;
  reason: MpPriceChangeReason | string | null;
  source: MpPriceSource | string | null;
  createdAt: string | null;
  updatedAt: string | null;
  decidedAt: string | null;
};

/** Bilan de la dernière vérification. */
export type MpPriceRun = {
  at: string;
  source: MpPriceSource | string;
  scope: 'tous' | 'modifiés' | string;
  checked: number;
  unchanged: number;
  applied: number;
  review: number;
  retired: number;
  skipped: number;
  errors: number;
  error: string | null;
  durationMs: number;
};

export type MpPricesOverview = {
  configured: boolean;
  running: boolean;
  /** Produits PEG reliés à Master Print. */
  linked: number;
  /** Dont ceux dont la majoration est connue (prix mis à jour tout seuls). */
  tracked: number;
  /** Changements « à revoir ». */
  pending: number;
  last: MpPriceRun | null;
  /** « À revoir » d'abord, puis les 30 derniers changements. */
  changes: MpPriceChange[];
};

/** Fiche produit admin. */
export type MpProductPriceStatus = {
  linked: boolean;
  tracked: boolean;
  markup: number | null;
  checkedAt: string | null;
  pending: MpPriceChange | null;
};
