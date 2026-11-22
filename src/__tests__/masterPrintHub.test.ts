/**
 * Page Master Print à onglets — règles pures (src/utils/masterPrintHub.ts).
 *   npx jest src/__tests__/masterPrintHub.test.ts
 */
import type {
  MpDashOrderRow,
  MpDashOrders,
} from '@/@types/masterPrintDashboard';
import {
  deltaPct,
  hubPath,
  legacyTarget,
  ringValue,
  shortOrderId,
  sparkPoints,
  stations,
  tabBadges,
  tabFromSearch,
} from '@/utils/masterPrintHub';

const row = (
  orderId: string,
  status: string,
  danger = false
): MpDashOrderRow => ({
  orderId,
  status,
  statusLabel: status,
  createdAt: null,
  alerts: danger
    ? [{ code: 'file_rejected', level: 'danger', label: 'Fichier refusé' }]
    : [],
  purchaseExclTax: 10,
  project: null,
  tracking: null,
});

const orders = (over: Partial<MpDashOrders> = {}): MpDashOrders => ({
  environment: 'sandbox',
  counted: 7,
  inProgress: 5,
  todo: 2,
  stages: [
    { code: 'payment', label: 'Paiement attendu', count: 0, always: false },
    { code: 'files', label: 'Fichiers attendus', count: 5, always: true },
    { code: 'proof', label: 'BAT à valider', count: 0, always: false },
    { code: 'production', label: 'En production', count: 1, always: true },
    { code: 'ready', label: 'Prête à l’atelier', count: 0, always: false },
    { code: 'shipped', label: 'Expédiée', count: 0, always: true },
    { code: 'delivered', label: 'Livrée', count: 0, always: true },
    { code: 'cancelled', label: 'Annulée', count: 1, always: false },
  ],
  months: [],
  thisMonth: {
    month: '2026-11',
    label: 'nov. 2026',
    orders: 0,
    purchase: 0,
    sale: 0,
    margin: null,
    marginProjects: 0,
  },
  lastMonth: {
    month: '2026-10',
    label: 'oct. 2026',
    orders: 0,
    purchase: 0,
    sale: 0,
    margin: null,
    marginProjects: 0,
  },
  totals: { orders: 0, purchase: 0, sale: 0, margin: null, marginProjects: 0 },
  todoOrders: [
    row('MP-ORD-2026-001313', 'awaiting_files', true),
    row('MP-ORD-2026-001382', 'awaiting_files'),
  ],
  recent: [
    row('MP-ORD-2026-001383', 'awaiting_files'),
    row('MP-ORD-2026-001382', 'awaiting_files'),
    row('MP-ORD-2026-001314', 'in_production'),
  ],
  excluded: { outsidePeg: 0, otherEnvironment: 0 },
  mpError: null,
  listComplete: true,
  listedAt: null,
  ...over,
});

describe('onglets et adresses', () => {
  it('adresse d’un onglet', () => {
    expect(hubPath('overview')).toBe('/admin/master-print');
    expect(hubPath('prix')).toBe('/admin/master-print?tab=prix');
    expect(hubPath('commandes', 'MP-ORD-2026-001313')).toBe(
      '/admin/master-print?tab=commandes&q=MP-ORD-2026-001313'
    );
    expect(hubPath('catalogue', 'ignoré')).toBe(
      '/admin/master-print?tab=catalogue'
    );
  });

  it('onglet lu dans l’adresse, vue d’ensemble par défaut', () => {
    expect(tabFromSearch('?tab=photos')).toBe('photos');
    expect(tabFromSearch('?tab=nimporte')).toBe('overview');
    expect(tabFromSearch('')).toBe('overview');
  });

  it('anciennes adresses → onglet', () => {
    expect(legacyTarget('/admin/master-print/orders')).toBe(
      '/admin/master-print?tab=commandes'
    );
    expect(legacyTarget('/admin/master-print/orders', '?q=MP-1')).toBe(
      '/admin/master-print?tab=commandes&q=MP-1'
    );
    expect(legacyTarget('/admin/master-print/catalog/')).toBe(
      '/admin/master-print?tab=catalogue'
    );
    expect(legacyTarget('/admin/master-print/autre')).toBe(
      '/admin/master-print'
    );
  });
});

describe('pastilles des onglets', () => {
  it('commandes en rouge s’il y a un fichier refusé, sinon orange', () => {
    expect(tabBadges({ orders: orders() }).commandes).toEqual({
      count: 2,
      level: 'danger',
    });
    expect(
      tabBadges({
        orders: orders({ todoOrders: [row('A', 'awaiting_files')] }),
      }).commandes
    ).toEqual({ count: 2, level: 'warning' });
    expect(
      tabBadges({ orders: orders({ todo: 0, todoOrders: [] }) }).commandes
    ).toBeUndefined();
  });

  it('prix, photos, compte', () => {
    const b = tabBadges({
      pricesPending: 3,
      offersWithoutPhotos: 4,
      webhookSubscribed: false,
    });
    expect(b.prix).toEqual({ count: 3, level: 'warning' });
    expect(b.photos).toEqual({ count: 4, level: 'info' });
    expect(b.compte).toEqual({ level: 'warning' });
    expect(
      tabBadges({ webhookSubscribed: false, serviceDown: true }).compte
    ).toEqual({ level: 'danger' });
    expect(tabBadges({ webhookSubscribed: true, pricesPending: 0 })).toEqual(
      {}
    );
  });
});

describe('chaîne de fabrication', () => {
  it('étapes du parcours (les rares seulement si elles servent), annulées à part', () => {
    const s = stations(orders());
    expect(s.stations.map((x) => x.code)).toEqual([
      'files',
      'production',
      'shipped',
      'delivered',
    ]);
    expect(s.cancelled).toBe(1);
  });

  it('numéros connus sous chaque étape, sans doublon, le reste en « +N »', () => {
    const files = stations(orders()).stations[0];
    expect(files.orders.map((o) => o.short)).toEqual([
      '001313',
      '001382',
      '001383',
    ]);
    expect(files.orders[0].danger).toBe(true);
    expect(files.more).toBe(2);
    expect(files.waitingOnYou).toBe(true);
    const prod = stations(orders()).stations[1];
    expect(prod.orders.map((o) => o.short)).toEqual(['001314']);
    expect(prod.more).toBe(0);
    expect(prod.waitingOnYou).toBe(false);
  });

  it('jamais plus de numéros que la commande en compte', () => {
    const o = orders({
      stages: orders().stages.map((s) =>
        s.code === 'files' ? { ...s, count: 1 } : s
      ),
    });
    expect(stations(o).stations[0].orders).toHaveLength(1);
  });

  it('numéro court', () => {
    expect(shortOrderId('MP-ORD-2026-001313')).toBe('001313');
    expect(shortOrderId('X')).toBe('X');
  });
});

describe('petits graphiques', () => {
  it('variation d’un mois sur l’autre', () => {
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(50, 100)).toBe(-50);
    expect(deltaPct(10, 0)).toBeNull();
  });

  it('courbe : de gauche à droite, le plus haut en haut, à plat si tout est nul', () => {
    const p = sparkPoints([0, 10, 5], 84, 30);
    expect(p[0][0]).toBe(4);
    expect(p[2][0]).toBe(80);
    expect(p[1][1]).toBe(4);
    expect(p[0][1]).toBe(26);
    expect(sparkPoints([0, 0], 84, 30).every(([, y]) => y === 15)).toBe(true);
    expect(sparkPoints([], 84, 30)).toEqual([]);
  });

  it('anneau borné de 0 à 100', () => {
    expect(ringValue(7, 10)).toBe(70);
    expect(ringValue(3, 0)).toBe(0);
    expect(ringValue(12, 10)).toBe(100);
  });
});
