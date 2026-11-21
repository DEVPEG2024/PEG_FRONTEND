/**
 * Commandes Master Print et marge — règles pures (src/utils/masterPrintOrders.ts).
 *   npx jest src/__tests__/masterPrintOrders.test.ts
 */
import type { MpOrderView } from '@/@types/masterPrint';
import type {
  MpAdminOrder,
  MpWebhookDelivery,
} from '@/@types/masterPrintOrders';
import {
  deliveryLabel,
  envLabel,
  errorFromText,
  eventLabel,
  filesLabel,
  invoiceOrders,
  marginView,
  orderPurchase,
  projectMargin,
  projectPurchase,
  rowMargin,
} from '@/utils/masterPrintOrders';

const order = (o: Partial<MpOrderView>): MpOrderView => ({
  orderId: 'MP-ORD-2026-001315',
  environment: 'sandbox',
  status: 'shipped',
  statusLabel: 'Expédiée',
  createdAt: '2026-11-20T14:50:32+01:00',
  totalExclTax: 94.14,
  totalWithShippingExclTax: null,
  blindShipping: true,
  tracking: null,
  invoiceNumber: null,
  productionOrders: [],
  lines: [],
  history: [],
  missingFiles: 0,
  uploads: [],
  uploading: false,
  ...o,
});

const adminOrder = (o: Partial<MpAdminOrder>): MpAdminOrder => ({
  key: 'sandbox|MP-ORD-2026-001315',
  orderId: 'MP-ORD-2026-001315',
  environment: 'sandbox',
  sameEnvironment: true,
  status: 'shipped',
  statusLabel: 'Expédiée',
  createdAt: null,
  updatedAt: null,
  reference: null,
  known: true,
  projectDocumentId: 'projet0000000001',
  project: {
    documentId: 'projet0000000001',
    name: 'T-shirts Groppi',
    price: 250,
    state: 'pending',
    customerName: 'GROPPI',
  },
  projectPurchase: { amount: 94.14, orders: 1, environment: 'sandbox' },
  files: { received: 2, expected: 2 },
  alerts: [],
  todo: false,
  purchaseExclTax: 94.14,
  shippingIncluded: false,
  tracking: null,
  invoiceNumber: 'SANDBOX-F-001315',
  invoiceAvailable: true,
  detail: 'stored',
  ...o,
});

describe('achat d’une commande et d’un projet', () => {
  it('port compris quand Master Print le donne', () => {
    expect(orderPurchase(order({ totalWithShippingExclTax: 101.5 }))).toBe(
      101.5
    );
    expect(orderPurchase(order({}))).toBe(94.14);
    expect(orderPurchase(order({ totalExclTax: null }))).toBeNull();
  });

  it('commandes non annulées ; les réelles priment sur le bac à sable', () => {
    expect(
      projectPurchase([
        order({ totalExclTax: 78.96 }),
        order({ status: 'cancelled', totalExclTax: 79.68 }),
        order({ status: 'in_production', totalExclTax: 79.68 }),
      ])
    ).toEqual({ amount: 158.64, orders: 2, environment: 'sandbox' });
    expect(
      projectPurchase([
        order({ totalExclTax: 78.96 }),
        order({ environment: 'production', totalExclTax: 120 }),
      ])
    ).toEqual({ amount: 120, orders: 1, environment: 'production' });
    expect(projectPurchase([order({ status: 'cancelled' })])).toBeNull();
    expect(projectPurchase([])).toBeNull();
  });
});

describe('marge', () => {
  it('montant et taux sur la vente, négative signalée', () => {
    expect(marginView(250, 94.14)).toEqual({
      amount: 155.86,
      rate: 62.3,
      negative: false,
    });
    expect(marginView(80, 94.14)).toEqual({
      amount: -14.14,
      rate: -17.7,
      negative: true,
    });
    expect(marginView(null, 94.14)).toBeNull();
  });

  it('carte du projet : rien, prix manquant, ou marge', () => {
    expect(projectMargin(250, [])).toEqual({ state: 'none' });
    expect(projectMargin(null, [order({})])).toEqual({
      state: 'no_price',
      purchase: { amount: 94.14, orders: 1, environment: 'sandbox' },
    });
    const m = projectMargin(250, [order({})]);
    expect(m.state).toBe('ok');
    if (m.state === 'ok') {
      expect(m.sale).toBe(250);
      expect(m.margin.amount).toBe(155.86);
    }
  });

  it('ligne de la page : marge du projet, rien si annulée ou hors PEG', () => {
    expect(rowMargin(adminOrder({}))).toEqual({
      sale: 250,
      margin: { amount: 155.86, rate: 62.3, negative: false },
      sharedWith: 1,
    });
    expect(rowMargin(adminOrder({ status: 'cancelled' })).margin).toBeNull();
    expect(
      rowMargin(adminOrder({ known: false, project: null })).margin
    ).toBeNull();
    expect(
      rowMargin(
        adminOrder({
          projectPurchase: { amount: 300, orders: 2, environment: 'sandbox' },
        })
      )
    ).toEqual({
      sale: 250,
      margin: { amount: -50, rate: -20, negative: true },
      sharedWith: 2,
    });
  });
});

describe('factures et affichage', () => {
  it('seules les factures lisibles avec la clé actuelle', () => {
    const orders = [
      order({ invoiceNumber: 'SANDBOX-F-001315' }),
      order({ orderId: 'B', invoiceNumber: null }),
      order({
        orderId: 'C',
        environment: 'production',
        invoiceNumber: 'F-000001',
      }),
    ];
    expect(invoiceOrders(orders, 'sandbox').map((o) => o.orderId)).toEqual([
      'MP-ORD-2026-001315',
    ]);
    expect(invoiceOrders(orders, null)).toEqual([]);
  });

  it('libellés', () => {
    expect(envLabel('sandbox')).toBe('Essai');
    expect(envLabel('production')).toBe('Réel');
    expect(filesLabel({ received: 0, expected: 1 })).toBe('0/1');
    expect(filesLabel({ received: 0, expected: 0 })).toBe('aucun');
    expect(filesLabel(null)).toBe('—');
    expect(eventLabel('order.shipped')).toBe('Expédition');
    expect(eventLabel('autre.evenement')).toBe('autre.evenement');
  });

  it('résultat d’un envoi de Master Print', () => {
    const d = (x: Partial<MpWebhookDelivery>): MpWebhookDelivery => ({
      eventId: 'evt_a',
      event: 'order.status_changed',
      state: 'delivered',
      attempts: 1,
      responseCode: 200,
      lastError: null,
      createdAt: null,
      lastAttemptAt: null,
      deliveredAt: null,
      nextAttemptAt: null,
      receivedByPeg: true,
      ...x,
    });
    expect(deliveryLabel(d({}))).toEqual({
      label: 'Reçu (code 200)',
      level: 'info',
    });
    expect(
      deliveryLabel(d({ state: 'pending', responseCode: 401, attempts: 2 }))
    ).toEqual({
      label: 'Refusé (code 401), 2 essais, nouvel essai prévu',
      level: 'danger',
    });
    expect(
      deliveryLabel(d({ state: 'abandoned', responseCode: 500, attempts: 6 }))
    ).toEqual({ label: 'Abandonné (code 500), 6 essais', level: 'danger' });
    expect(deliveryLabel(d({ state: 'pending', responseCode: null }))).toEqual({
      label: 'En attente',
      level: 'warning',
    });
  });

  it('message d’erreur lu dans une réponse PDF en échec', () => {
    expect(
      errorFromText(
        '{"error":"Pas encore de facture pour cette commande."}',
        'x'
      )
    ).toBe('Pas encore de facture pour cette commande.');
    expect(errorFromText('%PDF-1.7', 'Facture indisponible')).toBe(
      'Facture indisponible'
    );
    expect(errorFromText(null, 'x')).toBe('x');
  });
});
