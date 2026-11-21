/**
 * Commandes Master Print et marge — règles pures (testées :
 * src/__tests__/masterPrintOrders.test.ts). Page admin « Commandes Master
 * Print » et carte « Marge » de l'onglet Master Print du projet.
 * Même règle d'achat que le serveur (peg_strapi `master-print-orders-text.ts`).
 */
import type { MpOrderView } from '@/@types/masterPrint';
import type {
  MpAdminOrder,
  MpAlertLevel,
  MpProjectPurchase,
  MpWebhookDelivery,
  MpWebhookHealth,
} from '@/@types/masterPrintOrders';
import { margin, type Tone } from './masterPrint';

// ── Achat, vente, marge ─────────────────────────────────────────────────────

/** Achat HT d'une commande : port compris quand Master Print le donne. */
export const orderPurchase = (
  o: Pick<MpOrderView, 'totalExclTax' | 'totalWithShippingExclTax'>
): number | null => {
  const n = o.totalWithShippingExclTax ?? o.totalExclTax;
  return n != null && Number.isFinite(Number(n)) && Number(n) > 0
    ? Number(n)
    : null;
};

/**
 * Achat HT d'un projet : ses commandes non annulées. Les commandes réelles
 * (production) priment ; sans elles, celles du bac à sable (essai).
 */
export function projectPurchase(
  orders: Array<
    Pick<
      MpOrderView,
      'status' | 'environment' | 'totalExclTax' | 'totalWithShippingExclTax'
    >
  >
): MpProjectPurchase | null {
  const active = orders.filter(
    (o) => o.status !== 'cancelled' && orderPurchase(o) != null
  );
  const live = active.filter((o) => o.environment === 'production');
  const use = live.length
    ? live
    : active.filter((o) => o.environment === 'sandbox');
  if (!use.length) return null;
  const amount = use.reduce((a, o) => a + (orderPurchase(o) || 0), 0);
  return {
    amount: Math.round(amount * 100) / 100,
    orders: use.length,
    environment: live.length ? 'production' : 'sandbox',
  };
}

export type MarginView = { amount: number; rate: number; negative: boolean };

/** Marge HT (vente − achat) et taux sur la vente ; null sans vente ou sans achat. */
export function marginView(
  sale: number | null | undefined,
  purchase: number | null | undefined
): MarginView | null {
  const m = margin(sale, purchase);
  return m ? { ...m, negative: m.amount < 0 } : null;
}

export type ProjectMargin =
  | { state: 'none' }
  | { state: 'no_price'; purchase: MpProjectPurchase }
  | {
      state: 'ok';
      purchase: MpProjectPurchase;
      sale: number;
      margin: MarginView;
    };

/** Carte « Marge » de l'onglet Master Print du projet. */
export function projectMargin(
  price: number | null | undefined,
  orders: MpOrderView[]
): ProjectMargin {
  const purchase = projectPurchase(orders);
  if (!purchase) return { state: 'none' };
  const m = marginView(price, purchase.amount);
  if (!m || price == null) return { state: 'no_price', purchase };
  return { state: 'ok', purchase, sale: Number(price), margin: m };
}

/**
 * Marge affichée sur une ligne de la page Commandes : celle du PROJET (vente du
 * projet − toutes ses commandes non annulées). Rien pour une commande annulée ou
 * hors PEG.
 */
export function rowMargin(o: MpAdminOrder): {
  sale: number | null;
  margin: MarginView | null;
  sharedWith: number;
} {
  const sale = o.project?.price ?? null;
  if (!o.project || o.status === 'cancelled' || !o.projectPurchase)
    return { sale, margin: null, sharedWith: 0 };
  return {
    sale,
    margin: marginView(sale, o.projectPurchase.amount),
    sharedWith: o.projectPurchase.orders,
  };
}

/** Commandes du projet dont la facture d'achat est lisible avec la clé actuelle. */
export const invoiceOrders = (
  orders: MpOrderView[],
  environment: string | null | undefined
) =>
  orders.filter(
    (o) => !!o.invoiceNumber && !!environment && o.environment === environment
  );

// ── Affichage ───────────────────────────────────────────────────────────────

export const envLabel = (env: string | null | undefined) =>
  env === 'production' ? 'Réel' : env === 'sandbox' ? 'Essai' : '—';

export const filesLabel = (
  files: { received: number; expected: number } | null | undefined
) =>
  !files
    ? '—'
    : files.expected === 0
      ? 'aucun'
      : `${files.received}/${files.expected}`;

export const ALERT_TONES: Record<MpAlertLevel, Tone> = {
  danger: {
    color: '#fca5a5',
    background: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.4)',
  },
  warning: {
    color: '#fcd34d',
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
  },
  info: {
    color: '#93c5fd',
    background: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
  },
  muted: {
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
};

export const HEALTH_TONES: Record<MpWebhookHealth['level'], Tone> = {
  ok: {
    color: '#86efac',
    background: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
  },
  warning: ALERT_TONES.warning,
  danger: ALERT_TONES.danger,
};

const EVENT_LABELS: Record<string, string> = {
  'order.status_changed': 'Changement de statut',
  'order.shipped': 'Expédition',
  'proof.available': 'BAT disponible',
  'price.changed': 'Prix modifiés',
};

export const eventLabel = (event: string) => EVENT_LABELS[event] || event;

const okCode = (c: number | null) => c != null && c >= 200 && c < 300;

/** Résultat d'un envoi de Master Print vers ce serveur, en clair. */
export function deliveryLabel(d: MpWebhookDelivery): {
  label: string;
  level: MpAlertLevel;
} {
  const code = d.responseCode != null ? ` (code ${d.responseCode})` : '';
  const tries = d.attempts > 1 ? `, ${d.attempts} essais` : '';
  if (d.state === 'delivered') return { label: `Reçu${code}`, level: 'info' };
  if (d.state === 'abandoned')
    return { label: `Abandonné${code}${tries}`, level: 'danger' };
  if (d.responseCode != null && !okCode(d.responseCode))
    return {
      label: `Refusé${code}${tries}, nouvel essai prévu`,
      level: 'danger',
    };
  return { label: 'En attente', level: 'warning' };
}

/** Message d'erreur du serveur lu dans le corps (texte) d'une réponse en échec. */
export function errorFromText(
  text: string | null | undefined,
  fallback: string
) {
  try {
    const data = JSON.parse(text || '');
    const msg = data?.error ?? data?.message;
    return typeof msg === 'string' && msg ? msg : fallback;
  } catch {
    return fallback;
  }
}
