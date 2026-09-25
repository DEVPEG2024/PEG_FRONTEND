// Règle « facture à régler », partagée par la page Factures (totaux « En
// attente ») et l'accueil client (montant à régler, bloc « À faire ») : une
// facture non annulée compte tant qu'elle n'est pas « Payé » — virement
// déclaré mais non confirmé compris.
type InvoiceLike = { state?: string | null; paymentState?: string | null };

export const isInvoiceCanceled = (inv: InvoiceLike): boolean => inv.state === 'canceled';

export const isInvoiceOutstanding = (inv: InvoiceLike): boolean =>
  !isInvoiceCanceled(inv) && inv.paymentState !== 'fulfilled';

/** Le client a déjà déclaré son virement : rien à lui redemander. */
export const isTransferPending = (inv: InvoiceLike): boolean =>
  inv.paymentState === 'pending_transfer';
