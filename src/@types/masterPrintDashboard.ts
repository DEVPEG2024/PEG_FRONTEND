/**
 * Tableau de bord Master Print (ajout 22/11/2026) — réponse de
 * `GET /master-print/admin/dashboard` (peg_strapi `master-print-dashboard.service.ts`).
 * Admin seulement.
 */
import type { MpEnvironment } from '@/@types/masterPrint';
import type { MpOrderAlert } from '@/@types/masterPrintOrders';

export type MpDashMonth = {
  /** « 2026-11 » (mois de Paris). */
  month: string;
  /** « nov. 2026 ». */
  label: string;
  /** Commandes non annulées créées ce mois-là. */
  orders: number;
  /** Achats HT de ces commandes. */
  purchase: number;
  /** Ventes HT des projets PEG commencés ce mois-là. */
  sale: number;
  /** Marge HT de ces projets ; null sans projet chiffré. */
  margin: number | null;
  marginProjects: number;
};

export type MpDashOrderRow = {
  orderId: string;
  status: string;
  statusLabel: string;
  createdAt: string | null;
  alerts: MpOrderAlert[];
  purchaseExclTax: number | null;
  project: {
    documentId: string;
    name: string;
    customerName: string | null;
  } | null;
  tracking: {
    carrier: string | null;
    number: string | null;
    url: string | null;
  } | null;
};

export type MpDashStage = {
  code: string;
  label: string;
  count: number;
  always: boolean;
};

export type MpDashOrders = {
  environment: string;
  counted: number;
  inProgress: number;
  todo: number;
  stages: MpDashStage[];
  months: MpDashMonth[];
  thisMonth: MpDashMonth;
  lastMonth: MpDashMonth;
  totals: {
    orders: number;
    purchase: number;
    sale: number;
    margin: number | null;
    marginProjects: number;
  };
  todoOrders: MpDashOrderRow[];
  recent: MpDashOrderRow[];
  excluded: { outsidePeg: number; otherEnvironment: number };
  mpError: string | null;
  listComplete: boolean;
  listedAt: string | null;
};

export type MpDashCatalog = {
  linked: number;
  active: number;
  withOffer: number;
  withPhotos: number;
  tracked: number;
  withoutOffer: Array<{ documentId: string; name: string }>;
  withoutOfferCount: number;
  offersWithoutPhotos: Array<{ documentId: string; name: string }>;
  offersWithoutPhotosCount: number;
};

export type MpDashboard =
  | { configured: false }
  | {
      configured: true;
      environment: MpEnvironment;
      generatedAt: string;
      orders: MpDashOrders | null;
      ordersError: string | null;
      catalog: MpDashCatalog | null;
      catalogError: string | null;
    };
