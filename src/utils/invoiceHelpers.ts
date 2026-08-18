/**
 * Séquence de numérotation des factures — vue frontend.
 *
 * ⚠️ Le numéro est attribué par le SERVEUR (peg_strapi →
 * src/services/invoice-numbering.service.ts), de façon atomique, pour toutes
 * les sources : admin PEG, NOVA, paiement Stripe, devis, paiement différé.
 * Rien ici ne calcule ni ne devine un numéro : ces helpers ne servent qu'à
 * l'affichage et aux garde-fous d'interface.
 */

/** Série en cours. `INV-*` = ancienne série, close, conservée telle quelle. */
export const INVOICE_SERIES_RE = /^FAC-\d+$/;

/** Ancienne série (référence horodatée), antérieure à l'unification. */
export const LEGACY_SERIES_RE = /^INV-/;

/**
 * La facture appartient-elle à la séquence officielle ?
 * Si oui, elle ne peut être ni renumérotée ni supprimée — seulement annulée,
 * afin que la séquence reste continue.
 */
export const isNumberedInvoice = (name?: string | null): boolean =>
  typeof name === 'string' && INVOICE_SERIES_RE.test(name);

/** Document émis hors PEG (PDF téléversé) : hors séquence, supprimable. */
export const isExternalInvoice = (name?: string | null): boolean =>
  !isNumberedInvoice(name) && !LEGACY_SERIES_RE.test(name ?? '');

/** Étiquette courte pour signaler l'origine d'un numéro dans les listes. */
export const invoiceSeriesLabel = (name?: string | null): string | null => {
  if (isNumberedInvoice(name)) return null;
  if (LEGACY_SERIES_RE.test(name ?? '')) return 'Ancienne série';
  return 'Document externe';
};
