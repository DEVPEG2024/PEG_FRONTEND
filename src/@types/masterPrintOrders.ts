/**
 * Page admin « Commandes Master Print » (ajout 20/11/2026) — réponses de
 * peg_strapi `master-print-orders.service.ts` (admin seulement).
 */
import type { MpEnvironment } from '@/@types/masterPrint';

export type MpAlertLevel = 'danger' | 'warning' | 'info' | 'muted';

export type MpOrderAlert = {
  code: string;
  level: MpAlertLevel;
  label: string;
  detail?: string | null;
};

export type MpProjectPurchase = {
  amount: number;
  orders: number;
  environment: string;
};

export type MpAdminOrder = {
  key: string;
  orderId: string;
  environment: string;
  /** Lisible avec la clé de ce serveur (sinon : commande de l'autre environnement). */
  sameEnvironment: boolean;
  status: string;
  statusLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
  reference: string | null;
  /** Enregistrée par PEG ; sinon « hors PEG » (autre serveur, autre outil). */
  known: boolean;
  projectDocumentId: string | null;
  project: {
    documentId: string;
    name: string;
    price: number | null;
    state: string | null;
    customerName: string | null;
  } | null;
  projectPurchase: MpProjectPurchase | null;
  files: { received: number; expected: number } | null;
  alerts: MpOrderAlert[];
  todo: boolean;
  purchaseExclTax: number | null;
  shippingIncluded: boolean;
  tracking: {
    carrier: string | null;
    number: string | null;
    url: string | null;
  } | null;
  invoiceNumber: string | null;
  invoiceAvailable: boolean;
  detail: 'fresh' | 'stored' | 'list';
};

export type MpOrdersFilter = 'todo' | 'all';

export type MpOrdersPage =
  | { configured: false }
  | {
      configured: true;
      environment: MpEnvironment;
      filter: MpOrdersFilter;
      q: string;
      offset: number;
      limit: number;
      total: number;
      counts: { all: number; todo: number };
      items: MpAdminOrder[];
      /** Master Print injoignable : seules les commandes enregistrées par PEG sont montrées. */
      mpError: string | null;
      listComplete: boolean;
      listedAt: string | null;
    };

export type MpWebhookSubscription = {
  id: string | null;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string | null;
  secretHint: string | null;
};

export type MpWebhookDelivery = {
  eventId: string | null;
  event: string;
  state: string;
  attempts: number;
  responseCode: number | null;
  lastError: string | null;
  createdAt: string | null;
  lastAttemptAt: string | null;
  deliveredAt: string | null;
  nextAttemptAt: string | null;
  receivedByPeg: boolean;
};

export type MpWebhookHealth = {
  level: 'ok' | 'warning' | 'danger';
  title: string;
  detail: string;
};

export type MpWebhooksOverview =
  | { configured: false }
  | {
      configured: true;
      environment: MpEnvironment;
      url: string | null;
      subscribed: boolean;
      subscriptions: MpWebhookSubscription[];
      others: Array<{ url: string; active: boolean; createdAt: string | null }>;
      stored: {
        url: string | null;
        since: string | null;
        hasSecret: boolean;
      } | null;
      deliveries: MpWebhookDelivery[];
      deliveriesSummary: {
        total: number;
        delivered: number;
        failed: number;
        pending: number;
      };
      deliveriesError: string | null;
      received: {
        count: number;
        last7Days: number;
        lastAt: string | null;
        recent: Array<{
          type: string;
          orderId: string | null;
          at: string | null;
        }>;
      };
      health: MpWebhookHealth;
      mpError: string | null;
    };
