/**
 * Tableau de bord Master Print — règles pures (testées :
 * src/__tests__/masterPrintDashboard.test.ts). Page admin
 * `/admin/master-print` (MasterPrintDashboard.tsx).
 *
 * « À faire » rassemble ce qui demande une action, le plus grave d'abord, à
 * partir des cinq lectures de la page : bilan (commandes + catalogue), compte
 * Master Print (/me), état du service, suivi automatique, prix.
 */
import type { MpStatus } from '@/@types/masterPrint';
import type { MpDashboard, MpDashMonth } from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import type { MpServiceStatus } from '@/services/MasterPrintStatusServices';
import { hubPath } from './masterPrintHub';

export type DashLevel = 'danger' | 'warning' | 'info';

export type DashAction = {
  key: string;
  level: DashLevel;
  title: string;
  detail?: string;
  /** Page où régler le point. */
  to?: string;
  cta?: string;
  /** Action faite sur place (bouton). */
  action?: 'subscribe';
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

const LEVEL_RANK: Record<DashLevel, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

// Onglets de la page Master Print (depuis le 22/11 : une seule page à onglets).
export const ORDERS_PATH = hubPath('commandes');
export const CATALOG_PATH = hubPath('catalogue');
export const PRICES_PATH = hubPath('prix');
export const PHOTOS_PATH = hubPath('photos');
export const ACCOUNT_PATH = hubPath('compte');
export const offerPath = (productDocumentId: string) =>
  `/admin/master-print/offers/${encodeURIComponent(productDocumentId)}`;
export const projectPath = (documentId: string) =>
  `/common/projects/details/${documentId}?tab=Master%20Print`;

const names = (list: Array<{ name: string }>, total: number) => {
  const shown = list.map((p) => p.name || 'Produit').join(', ');
  return total > list.length ? `${shown}… (+${total - list.length})` : shown;
};

export function dashboardActions(input: {
  dashboard?: MpDashboard | null;
  status?: MpStatus | null;
  service?: MpServiceStatus | null;
  webhooks?: MpWebhooksOverview | null;
  prices?: MpPricesOverview | null;
}): DashAction[] {
  const out: DashAction[] = [];
  const { status, service, webhooks, prices } = input;
  const dash =
    input.dashboard && input.dashboard.configured ? input.dashboard : null;

  if (service && service.configured !== false) {
    if (!service.ok) {
      out.push({
        key: 'service',
        level: 'danger',
        title: 'Master Print ne répond pas',
        detail: `${service.message} Les clients voient « momentanément indisponible » sur les offres Master Print.`,
      });
    } else if (service.degraded) {
      out.push({
        key: 'service',
        level: 'warning',
        title: 'Master Print répond mal',
        detail: service.message,
      });
    }
  }

  if (webhooks && webhooks.configured) {
    if (!webhooks.subscribed) {
      out.push({
        key: 'webhook',
        level: 'warning',
        title: 'Suivi automatique non branché',
        detail:
          'Master Print ne prévient pas PEG quand une commande avance ou quand ses prix changent : les statuts ne se mettent à jour qu’en actualisant à la main.',
        action: 'subscribe',
        cta: 'Abonner ce serveur',
      });
    } else if (webhooks.health.level !== 'ok') {
      out.push({
        key: 'webhook',
        level: webhooks.health.level,
        title: webhooks.health.title,
        detail: webhooks.health.detail,
        to: ACCOUNT_PATH,
        cta: 'Voir le suivi',
      });
    }
  }

  const orders = dash?.orders;
  if (orders && orders.todo > 0) {
    const danger = orders.todoOrders.some((o) =>
      o.alerts.some((a) => a.level === 'danger')
    );
    const labels = [
      ...new Set(
        orders.todoOrders.flatMap((o) => o.alerts.map((a) => a.label))
      ),
    ];
    out.push({
      key: 'orders',
      level: danger ? 'danger' : 'warning',
      title: `${plural(orders.todo, 'commande', 'commandes')} à traiter`,
      detail: labels.slice(0, 4).join(' · '),
      to: ORDERS_PATH,
      cta: 'Voir',
    });
  }

  if (prices && prices.pending > 0) {
    out.push({
      key: 'prices',
      level: 'warning',
      title: `${plural(prices.pending, 'changement de prix', 'changements de prix')} à revoir`,
      detail:
        'Master Print a changé ses prix sur des produits dont vous avez retouché les paliers : rien n’a été écrasé, à vous de décider.',
      to: PRICES_PATH,
      cta: 'Revoir',
    });
  }

  const catalog = dash?.catalog;
  if (catalog && catalog.withoutOfferCount > 0) {
    out.push({
      key: 'offers',
      level: 'info',
      title: `${plural(catalog.withoutOfferCount, 'produit importé', 'produits importés')} sans formulaire client`,
      detail: `Le client ne peut pas les configurer ni les commander seul : ${names(catalog.withoutOffer, catalog.withoutOfferCount)}.`,
      to: catalog.withoutOffer[0]
        ? offerPath(catalog.withoutOffer[0].documentId)
        : CATALOG_PATH,
      cta: 'Régler',
    });
  }
  if (catalog && catalog.offersWithoutPhotosCount > 0) {
    out.push({
      key: 'photos',
      level: 'info',
      title: `${plural(catalog.offersWithoutPhotosCount, 'offre', 'offres')} sans photo`,
      detail: `Le client voit une fiche sans image : ${names(catalog.offersWithoutPhotos, catalog.offersWithoutPhotosCount)}.`,
      to: PHOTOS_PATH,
      cta: 'Chercher les photos',
    });
  }

  if (status && status.configured) {
    if (status.environment === 'sandbox') {
      out.push({
        key: 'sandbox',
        level: 'info',
        title: 'Mode essai',
        detail:
          'Clé de test : les commandes ne partent pas en fabrication et rien n’est facturé. Pour passer en vrai, remplacer la clé par une clé « mp_live_… ».',
      });
    } else if (!status.liveModules.length) {
      out.push({
        key: 'live',
        level: 'warning',
        title: 'Aucune famille ouverte en vraies commandes',
        detail:
          'Master Print refusera toute commande tant qu’il n’a pas ouvert au moins une famille de produits à votre compte.',
      });
    }
  }

  return out.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
}

// ── Chiffres ────────────────────────────────────────────────────────────────

/** Taux de marge sur la vente, en % à une décimale ; null sans vente. */
export function marginRate(
  m:
    | Pick<MpDashMonth, 'sale' | 'margin'>
    | { sale: number; margin: number | null }
) {
  if (m.margin == null || !(m.sale > 0)) return null;
  return Math.round((m.margin / m.sale) * 1000) / 10;
}

/**
 * Graduations « rondes » d'un axe qui part de 0 : 1, 2 ou 5 × 10^n, 4 intervalles
 * au plus. Rend [0] quand tout est nul.
 */
export function niceTicks(max: number, intervals = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / intervals;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10]
    .map((k) => k * pow)
    .find((s) => s >= raw) as number;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step)
    out.push(Math.round(v * 100) / 100);
  return out;
}

/** « 1 200 € », « 12,5 k€ » : montant court pour un axe. */
export function compactEur(n: number): string {
  if (Math.abs(n) >= 10000)
    return `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}

/** Mois court pour l'axe : « nov. » (« nov. 25 » si l'année change dans la fenêtre). */
export function shortMonth(m: MpDashMonth, months: MpDashMonth[]): string {
  const [name, year] = m.label.split(' ');
  const years = new Set(months.map((x) => x.month.slice(0, 4)));
  return years.size > 1 ? `${name} ${String(year || '').slice(2)}` : name;
}

/** Les six mois sont-ils tous vides (aucun achat ni vente) ? */
export const monthsEmpty = (months: MpDashMonth[]) =>
  !months.some((m) => m.purchase > 0 || m.sale > 0);

/** « il y a 5 min », « il y a 3 h », « il y a 2 j » ; '' si inconnu. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/** Mode de paiement du compte Master Print, en clair. */
export function paymentModeLabel(mode: string | null | undefined): string {
  if (!mode) return '—';
  const m = mode.toLowerCase();
  if (m.includes('invoice') || m.includes('facture')) return 'Sur facture';
  if (m.includes('card') || m.includes('carte') || m.includes('order'))
    return 'À la commande';
  return mode;
}
