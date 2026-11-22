/**
 * Page « Master Print » à onglets (22/11/2026) — règles pures, testées :
 * src/__tests__/masterPrintHub.test.ts. Composant : views/app/admin/masterPrint/hub/.
 *
 * Une seule entrée de menu regroupe tout Master Print : vue d'ensemble, commandes,
 * catalogue, prix, photos, compte et suivi. L'onglet est dans l'adresse
 * (`/admin/master-print?tab=commandes`) : changer d'onglet ne recharge pas la page.
 */
import type {
  MpDashMonth,
  MpDashOrderRow,
  MpDashOrders,
} from '@/@types/masterPrintDashboard';

// ── Onglets ─────────────────────────────────────────────────────────────────

export const HUB_TABS = [
  { key: 'overview', label: 'Vue d’ensemble' },
  { key: 'commandes', label: 'Commandes' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'prix', label: 'Prix' },
  { key: 'photos', label: 'Photos' },
  { key: 'compte', label: 'Compte et suivi' },
] as const;

export type HubTab = (typeof HUB_TABS)[number]['key'];

export const HUB_PATH = '/admin/master-print';

const isTab = (v: unknown): v is HubTab => HUB_TABS.some((t) => t.key === v);

/** Adresse d'un onglet ; `q` : recherche de départ de l'onglet Commandes. */
export function hubPath(tab: HubTab, q?: string): string {
  const params = new URLSearchParams();
  if (tab !== 'overview') params.set('tab', tab);
  if (q && tab === 'commandes') params.set('q', q);
  const qs = params.toString();
  return qs ? `${HUB_PATH}?${qs}` : HUB_PATH;
}

/** Onglet lu dans l'adresse (vue d'ensemble par défaut). */
export function tabFromSearch(search: string): HubTab {
  const t = new URLSearchParams(search).get('tab');
  return isTab(t) ? t : 'overview';
}

/** Anciennes adresses (avant le 22/11) → onglet correspondant. */
export function legacyTarget(pathname: string, search = ''): string {
  const q = new URLSearchParams(search).get('q') || undefined;
  if (/\/orders\/?$/.test(pathname)) return hubPath('commandes', q);
  if (/\/catalog\/?$/.test(pathname)) return hubPath('catalogue');
  return HUB_PATH;
}

// ── Pastilles des onglets ───────────────────────────────────────────────────

export type TabBadge = {
  count?: number;
  level: 'danger' | 'warning' | 'info';
} | null;

export function tabBadges(input: {
  orders?: MpDashOrders | null;
  pricesPending?: number | null;
  offersWithoutPhotos?: number | null;
  webhookSubscribed?: boolean | null;
  serviceDown?: boolean;
}): Partial<Record<HubTab, TabBadge>> {
  const out: Partial<Record<HubTab, TabBadge>> = {};
  const o = input.orders;
  if (o && o.todo > 0) {
    const danger = o.todoOrders.some((r) =>
      r.alerts.some((a) => a.level === 'danger')
    );
    out.commandes = { count: o.todo, level: danger ? 'danger' : 'warning' };
  }
  if (input.pricesPending)
    out.prix = { count: input.pricesPending, level: 'warning' };
  if (input.offersWithoutPhotos)
    out.photos = { count: input.offersWithoutPhotos, level: 'info' };
  if (input.serviceDown) out.compte = { level: 'danger' };
  else if (input.webhookSubscribed === false) out.compte = { level: 'warning' };
  return out;
}

// ── Chaîne de fabrication ───────────────────────────────────────────────────

/** Encres des étapes (validées sur le fond des cartes, mode sombre ; toujours nommées). */
export const STAGE_INK: Record<string, string> = {
  payment: '#7c6cf0',
  files: '#c98500',
  proof: '#d95926',
  production: '#e0559f',
  ready: '#5b8def',
  shipped: '#1f9cc6',
  delivered: '#0ca30c',
  other: '#8b93a7',
};

export type Station = {
  code: string;
  label: string;
  count: number;
  ink: string;
  /** Commandes connues de cette étape (vue d'ensemble : à traiter + dernières), 3 au plus. */
  orders: Array<{ orderId: string; short: string; danger: boolean }>;
  /** Commandes de l'étape non montrées. */
  more: number;
  /** L'étape attend une action de PEG (fichiers, BAT, paiement). */
  waitingOnYou: boolean;
};

const STAGE_OF: Record<string, string> = {
  awaiting_payment: 'payment',
  awaiting_files: 'files',
  awaiting_proof_approval: 'proof',
  files_received: 'production',
  in_production: 'production',
  ready_for_pickup: 'ready',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

/** « MP-ORD-2026-001313 » → « 001313 ». */
export const shortOrderId = (id: string) => id.split('-').pop() || id;

export function stations(
  orders: MpDashOrders,
  max = 3
): { stations: Station[]; cancelled: number } {
  const known = new Map<string, MpDashOrderRow>();
  for (const r of [...orders.todoOrders, ...orders.recent])
    if (!known.has(r.orderId)) known.set(r.orderId, r);
  const list = orders.stages
    .filter((s) => s.code !== 'cancelled' && (s.always || s.count > 0))
    .map((s) => {
      const rows = [...known.values()].filter(
        (r) => (STAGE_OF[r.status] ?? 'other') === s.code
      );
      const shown = rows.slice(0, Math.min(max, s.count)).map((r) => ({
        orderId: r.orderId,
        short: shortOrderId(r.orderId),
        danger: r.alerts.some((a) => a.level === 'danger'),
      }));
      return {
        code: s.code,
        label: s.label,
        count: s.count,
        ink: STAGE_INK[s.code] || STAGE_INK.other,
        orders: shown,
        more: Math.max(0, s.count - shown.length),
        waitingOnYou:
          s.count > 0 && ['files', 'proof', 'payment'].includes(s.code),
      };
    });
  return {
    stations: list,
    cancelled: orders.stages.find((s) => s.code === 'cancelled')?.count || 0,
  };
}

// ── Petits graphiques ───────────────────────────────────────────────────────

/** Variation en % d'un mois sur l'autre ; null si le mois précédent est vide. */
export function deltaPct(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Points d'une courbe (x de 0 à w, y de h à 0) ; tout à plat au milieu si tout vaut 0. */
export function sparkPoints(
  values: number[],
  w: number,
  h: number,
  pad = 4
): Array<[number, number]> {
  if (!values.length) return [];
  const max = Math.max(...values);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [
    Math.round((pad + i * step) * 10) / 10,
    Math.round((max > 0 ? h - pad - (v / max) * (h - pad * 2) : h / 2) * 10) /
      10,
  ]);
}

/** Taux (0–100) d'un anneau ; borné. */
export const ringValue = (n: number, total: number) =>
  total > 0 ? Math.max(0, Math.min(100, Math.round((n / total) * 100))) : 0;

/** Achats des six mois, pour la courbe de la tuile « Achats ». */
export const purchaseSeries = (months: MpDashMonth[]) =>
  months.map((m) => m.purchase);
