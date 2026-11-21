/**
 * Master Print — devis d'achat (prix bloqué 15 jours) et catégories du
 * catalogue (admin seulement). Backend : peg_strapi
 * `master-print-quotes.service.ts`, `master-print-categories.service.ts`.
 */

/** Devis d'achat Master Print d'un projet (le numéro EST `quoteId`, ex. Q-2026-000123). */
export type MpQuoteView = {
  quoteId: string;
  totalExclTax: number | null;
  totalInclTax: number | null;
  /** ISO 8601 : fin de validité (15 jours après le devis). */
  validUntil: string | null;
  expired: boolean;
  /** Une commande a déjà été créée depuis ce devis (il ne resservira pas). */
  used: boolean;
  orderId: string | null;
  createdAt: string | null;
  linesCount: number;
};

/** none = pas de devis ; changed = lignes modifiées ; expired ; used = déjà servi. */
export type MpQuoteReason = 'none' | 'changed' | 'expired' | 'used';

/** La commande partirait-elle depuis le devis, avec les lignes actuelles du formulaire ? */
export type MpQuoteDecision =
  | { use: true; quoteId: string; reason: null }
  | { use: false; quoteId: string | null; reason: MpQuoteReason };

export type MpQuoteCheck = {
  quote: MpQuoteView | null;
  /** null = lignes incomplètes (rien à comparer). */
  decision: MpQuoteDecision | null;
};

/** Ce que l'envoi renvoie en plus de la commande. */
export type MpSendQuoteOutcome = {
  used: boolean;
  quoteId: string | null;
  reason: MpQuoteReason | null;
};

/** 409 price_changed : le prix a changé depuis le devis (ou devis expiré). */
export type MpQuotePriceChange = {
  message: string;
  quoteId: string | null;
  oldTotalExclTax: number | null;
  newTotalExclTax: number | null;
};

/** Catégorie du catalogue Master Print (`GET /categories`). */
export type MpCategory = {
  code: string;
  label: string;
  products: number | null;
};

export type MpCategoriesResponse = {
  categories: MpCategory[];
  /** Rangement à l'import : catégorie Master Print → catégorie PEG choisie la dernière fois. */
  pegCategories: Record<string, string>;
};
