/**
 * Tableau de bord Master Print — règles pures (src/utils/masterPrintDashboard.ts).
 *   npx jest src/__tests__/masterPrintDashboard.test.ts
 */
import type { MpStatus } from '@/@types/masterPrint';
import type {
  MpDashboard,
  MpDashMonth,
  MpDashOrders,
} from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import type { MpServiceStatus } from '@/services/MasterPrintStatusServices';
import {
  ago,
  compactEur,
  dashboardActions,
  marginRate,
  monthsEmpty,
  niceTicks,
  offerPath,
  paymentModeLabel,
  shortMonth,
} from '@/utils/masterPrintDashboard';

const month = (
  m: string,
  label: string,
  over: Partial<MpDashMonth> = {}
): MpDashMonth => ({
  month: m,
  label,
  orders: 0,
  purchase: 0,
  sale: 0,
  margin: null,
  marginProjects: 0,
  ...over,
});

const orders = (over: Partial<MpDashOrders> = {}): MpDashOrders => ({
  environment: 'sandbox',
  counted: 0,
  inProgress: 0,
  todo: 0,
  stages: [],
  months: [],
  thisMonth: month('2026-11', 'nov. 2026'),
  lastMonth: month('2026-10', 'oct. 2026'),
  totals: { orders: 0, purchase: 0, sale: 0, margin: null, marginProjects: 0 },
  todoOrders: [],
  recent: [],
  excluded: { outsidePeg: 0, otherEnvironment: 0 },
  mpError: null,
  listComplete: true,
  listedAt: null,
  ...over,
});

const dashboard = (
  o: Partial<MpDashOrders> = {},
  catalog: Partial<
    NonNullable<Extract<MpDashboard, { configured: true }>['catalog']>
  > = {}
): MpDashboard => ({
  configured: true,
  environment: 'sandbox',
  generatedAt: '2026-11-22T10:00:00Z',
  orders: orders(o),
  ordersError: null,
  catalog: {
    linked: 3,
    active: 3,
    withOffer: 3,
    withPhotos: 3,
    tracked: 3,
    withoutOffer: [],
    withoutOfferCount: 0,
    offersWithoutPhotos: [],
    offersWithoutPhotosCount: 0,
    ...catalog,
  },
  catalogError: null,
});

const status = (
  over: Partial<Extract<MpStatus, { configured: true }>> = {}
): MpStatus => ({
  configured: true,
  environment: 'production',
  clientId: 'MP-000022',
  company: 'PEG',
  paymentMode: 'invoice',
  priceTier: 'Gold',
  modules: [{ code: 'dtf', label: 'Film DTF' }],
  liveModules: [{ code: 'dtf', label: 'Film DTF' }],
  webhook: null,
  appliesToProject: true,
  ...over,
});

const service = (over: Partial<MpServiceStatus> = {}): MpServiceStatus => ({
  ok: true,
  degraded: false,
  configured: true,
  message: 'Master Print répond normalement.',
  checkedAt: '2026-11-22T10:00:00Z',
  lastFailureAt: null,
  ...over,
});

const hooks = (
  subscribed: boolean,
  level: 'ok' | 'warning' | 'danger' = 'ok'
): MpWebhooksOverview => ({
  configured: true,
  environment: 'production',
  url: 'https://api.mypeg.fr/api/master-print/webhook',
  subscribed,
  subscriptions: [],
  others: [],
  stored: null,
  deliveries: [],
  deliveriesSummary: { total: 0, delivered: 0, failed: 0, pending: 0 },
  deliveriesError: null,
  received: { count: 0, last7Days: 0, lastAt: null, recent: [] },
  health: {
    level,
    title: level === 'ok' ? 'Tout va bien' : 'Envois en échec',
    detail: 'Détail',
  },
  mpError: null,
});

const prices = (pending: number): MpPricesOverview => ({
  configured: true,
  running: false,
  linked: 3,
  tracked: 3,
  pending,
  last: null,
  changes: [],
});

describe('« À faire »', () => {
  it('tout en ordre : rien à faire', () => {
    expect(
      dashboardActions({
        dashboard: dashboard(),
        status: status(),
        service: service(),
        webhooks: hooks(true),
        prices: prices(0),
      })
    ).toEqual([]);
  });

  it('suivi automatique non branché → bouton « Abonner ce serveur »', () => {
    const a = dashboardActions({ webhooks: hooks(false) });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      key: 'webhook',
      level: 'warning',
      action: 'subscribe',
      cta: 'Abonner ce serveur',
    });
  });

  it('suivi branché mais en échec → reprend le diagnostic du suivi', () => {
    const a = dashboardActions({ webhooks: hooks(true, 'danger') });
    expect(a[0]).toMatchObject({
      key: 'webhook',
      level: 'danger',
      title: 'Envois en échec',
    });
  });

  it('le plus grave d’abord : service en panne, commandes, prix, catalogue, mode essai', () => {
    const a = dashboardActions({
      dashboard: dashboard(
        {
          todo: 2,
          todoOrders: [
            {
              orderId: 'MP-ORD-1',
              status: 'awaiting_files',
              statusLabel: 'Fichiers attendus',
              createdAt: null,
              alerts: [
                {
                  code: 'files_waiting',
                  level: 'warning',
                  label: 'Fichiers attendus',
                },
              ],
              purchaseExclTax: 10,
              project: null,
              tracking: null,
            },
          ],
        },
        {
          withoutOffer: [{ documentId: 'doc1', name: 'Roll-up' }],
          withoutOfferCount: 1,
          offersWithoutPhotos: [{ documentId: 'doc2', name: 'Film DTF' }],
          offersWithoutPhotosCount: 1,
        }
      ),
      status: status({ environment: 'sandbox' }),
      service: service({ ok: false, message: 'Délai dépassé.' }),
      webhooks: hooks(true),
      prices: prices(3),
    });
    expect(a.map((x) => x.key)).toEqual([
      'service',
      'orders',
      'prices',
      'offers',
      'photos',
      'sandbox',
    ]);
    expect(a[1]).toMatchObject({
      title: '2 commandes à traiter',
      level: 'warning',
      detail: 'Fichiers attendus',
    });
    expect(a[2].title).toBe('3 changements de prix à revoir');
    expect(a[3]).toMatchObject({
      title: '1 produit importé sans formulaire client',
      to: offerPath('doc1'),
    });
    expect(a[3].detail).toContain('Roll-up');
    expect(a[4].title).toBe('1 offre sans photo');
  });

  it('une commande avec fichier refusé rend l’alerte rouge', () => {
    const a = dashboardActions({
      dashboard: dashboard({
        todo: 1,
        todoOrders: [
          {
            orderId: 'MP-ORD-2',
            status: 'awaiting_files',
            statusLabel: 'Fichiers attendus',
            createdAt: null,
            alerts: [
              {
                code: 'file_rejected',
                level: 'danger',
                label: 'Fichier refusé',
              },
            ],
            purchaseExclTax: null,
            project: null,
            tracking: null,
          },
        ],
      }),
    });
    expect(a[0]).toMatchObject({
      key: 'orders',
      level: 'danger',
      title: '1 commande à traiter',
    });
  });

  it('production sans famille ouverte → avertissement', () => {
    const a = dashboardActions({ status: status({ liveModules: [] }) });
    expect(a[0]).toMatchObject({ key: 'live', level: 'warning' });
  });

  it('liste coupée : le reste est compté', () => {
    const a = dashboardActions({
      dashboard: dashboard(
        {},
        {
          withoutOffer: [
            { documentId: 'a', name: 'A' },
            { documentId: 'b', name: 'B' },
          ],
          withoutOfferCount: 7,
        }
      ),
    });
    expect(a[0].detail).toContain('A, B… (+5)');
  });
});

describe('chiffres', () => {
  it('graduations rondes, de 0 au-dessus du maximum', () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(430)).toEqual([0, 200, 400, 600]);
    expect(niceTicks(1000)).toEqual([0, 500, 1000]);
    expect(niceTicks(87)).toEqual([0, 50, 100]);
  });

  it('montants courts pour l’axe', () => {
    expect(compactEur(0)).toBe('0 €');
    expect(compactEur(1200).replace(/\s/g, ' ')).toBe('1 200 €');
    expect(compactEur(12500).replace(/\s/g, ' ')).toBe('12,5 k€');
  });

  it('taux de marge sur la vente', () => {
    expect(marginRate({ sale: 500, margin: 250 })).toBe(50);
    expect(marginRate({ sale: 0, margin: 10 })).toBeNull();
    expect(marginRate({ sale: 300, margin: null })).toBeNull();
  });

  it('mois court, avec l’année quand la fenêtre change d’année', () => {
    const one = [month('2026-10', 'oct. 2026'), month('2026-11', 'nov. 2026')];
    expect(shortMonth(one[1], one)).toBe('nov.');
    const two = [month('2025-12', 'déc. 2025'), month('2026-01', 'janv. 2026')];
    expect(shortMonth(two[0], two)).toBe('déc. 25');
  });

  it('six mois vides', () => {
    expect(monthsEmpty([month('2026-11', 'nov. 2026')])).toBe(true);
    expect(monthsEmpty([month('2026-11', 'nov. 2026', { purchase: 5 })])).toBe(
      false
    );
  });

  it('il y a…', () => {
    const now = Date.parse('2026-11-22T10:00:00Z');
    expect(ago(null, now)).toBe('');
    expect(ago('2026-11-22T09:55:00Z', now)).toBe('il y a 5 min');
    expect(ago('2026-11-22T07:00:00Z', now)).toBe('il y a 3 h');
    expect(ago('2026-11-19T10:00:00Z', now)).toBe('il y a 3 j');
  });

  it('mode de paiement en clair', () => {
    expect(paymentModeLabel('invoice')).toBe('Sur facture');
    expect(paymentModeLabel('card')).toBe('À la commande');
    expect(paymentModeLabel(null)).toBe('—');
  });
});
