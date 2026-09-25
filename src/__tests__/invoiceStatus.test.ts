// Règle « facture à régler » partagée par la page Factures et l'accueil client.
import { isInvoiceCanceled, isInvoiceOutstanding, isTransferPending } from '@/utils/invoiceStatus';

describe('isInvoiceOutstanding', () => {
  test('non payée → à régler', () => {
    expect(isInvoiceOutstanding({ state: 'pending', paymentState: 'pending' })).toBe(true);
  });
  test('virement déclaré mais pas encore confirmé → toujours à régler', () => {
    expect(isInvoiceOutstanding({ state: 'pending', paymentState: 'pending_transfer' })).toBe(true);
  });
  test('payée → non', () => {
    expect(isInvoiceOutstanding({ state: 'fulfilled', paymentState: 'fulfilled' })).toBe(false);
  });
  test('annulée → jamais, même impayée', () => {
    expect(isInvoiceOutstanding({ state: 'canceled', paymentState: 'pending' })).toBe(false);
    expect(isInvoiceCanceled({ state: 'canceled' })).toBe(true);
  });
});

test('isTransferPending : rien à redemander au client', () => {
  expect(isTransferPending({ paymentState: 'pending_transfer' })).toBe(true);
  expect(isTransferPending({ paymentState: 'pending' })).toBe(false);
});
