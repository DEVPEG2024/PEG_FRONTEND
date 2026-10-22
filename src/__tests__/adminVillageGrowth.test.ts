// Ville PEG — ce qui grandit : tendances des chiffres, activité du mois,
// camions de livraison du jour et caméra.
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  activityInfo,
  activityLevel,
  buildVillageData,
  currentSnapshot,
  sinceLabel,
  trendOf,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';
import {
  MAP_H,
  MAP_W,
  ZOOM_MAX,
  cameraOffset,
  clampOffset,
  focusOf,
  stepZoom,
} from '@/views/app/admin/home/village/villageScene';

dayjs.locale('fr');
const NOW = new Date('2026-10-21T10:00:00');

describe('village — tendances', () => {
  it('libellé de la période comparée', () => {
    expect(sinceLabel('2026-10-20', NOW)).toBe('depuis hier');
    expect(sinceLabel('2026-10-14', NOW)).toBe('en 7 jours');
    expect(sinceLabel('2026-10-17', NOW)).toBe('depuis le 17 octobre');
  });

  it('sens favorable, montants, chiffre manquant', () => {
    expect(trendOf(40, 36, 'up', 'en 7 jours')).toEqual({
      delta: 4,
      text: '+4',
      tone: 'good',
      since: 'en 7 jours',
    });
    expect(trendOf(3, 5, 'down', 'depuis hier')?.tone).toBe('good');
    expect(trendOf(5, 3, 'down', 'depuis hier')).toMatchObject({
      text: '+2',
      tone: 'bad',
    });
    expect(trendOf(5, 5, 'up', 'depuis hier')).toMatchObject({
      delta: 0,
      text: '=',
      tone: 'neutral',
    });
    expect(
      trendOf(1200, 2000, 'down', 'en 7 jours', (n) => `${n} €`)?.text
    ).toBe('−800 €');
    expect(trendOf(undefined, 3, 'up', 'depuis hier')).toBeNull();
    expect(trendOf(3, undefined, 'up', 'depuis hier')).toBeNull();
  });

  it('même photo des chiffres que le serveur', () => {
    const raw: RawVillage = {
      projects: {
        pending: 30,
        pendingPaid: 8,
        waiting: 4,
        sav: 1,
        late: 2,
        next: null,
      },
      invoices: {
        total: 2,
        unpaid: [
          { documentId: 'a', totalAmount: 486, dueDate: '2026-10-15T00:00:00' },
          {
            documentId: 'b',
            totalAmount: 1000,
            dueDate: '2026-11-15T00:00:00',
          },
        ],
      },
      tickets: { open: 5 },
    };
    expect(currentSnapshot(raw, NOW)).toEqual({
      projectsInProgress: 38,
      projectsLate: 2,
      overdueInvoices: 1,
      unpaidTotal: 1486,
      ticketsOpen: 5,
    });
  });

  it('flèches sur les chiffres clés et dans les fiches', () => {
    const d = buildVillageData(
      {
        projects: {
          pending: 30,
          pendingPaid: 8,
          waiting: 4,
          sav: 1,
          late: 2,
          next: null,
        },
        customers: { total: 64, newMonth: 3, subscribers: 18, toProcess: 2 },
        tickets: { open: 5 },
        trends: {
          since: '2026-10-14',
          values: {
            projectsInProgress: 34,
            customers: 64,
            ticketsOpen: 7,
            projectsLate: 1,
          },
        },
      },
      NOW,
      false
    );
    expect(d.kpis.trends.projectsInProgress).toMatchObject({
      text: '+4',
      tone: 'good',
      since: 'en 7 jours',
    });
    const stat = (id: 'projets' | 'clients' | 'tickets', label: string) =>
      d.sections[id].stats.find((s) => s.label === label);
    expect(stat('projets', 'En retard')?.trend).toMatchObject({
      text: '+1',
      tone: 'bad',
    });
    expect(stat('tickets', 'Ouverts')?.trend).toMatchObject({
      text: '−2',
      tone: 'good',
    });
    // Inchangé : pas de flèche dans la fiche.
    expect(stat('clients', 'Clients')?.trend).toBeUndefined();
    // Sans photo du serveur : aucune flèche.
    const none = buildVillageData({ tickets: { open: 5 } }, NOW, false);
    expect(none.kpis.trends).toEqual({});
    expect(none.sections.tickets.stats[0].trend).toBeUndefined();
  });
});

describe('village — activité du mois', () => {
  it('niveaux face à la moyenne des trois périodes précédentes', () => {
    expect(activityLevel(0, [10, 12, 8])).toBe(0);
    expect(activityLevel(6, [10, 12, 8])).toBe(0);
    expect(activityLevel(8, [10, 12, 8])).toBe(1);
    expect(activityLevel(12, [10, 12, 8])).toBe(2);
    expect(activityLevel(16, [10, 12, 8])).toBe(3);
    // Peu de volume : jamais « exceptionnel » sur 2 ou 3 éléments.
    expect(activityLevel(3, [0, 1, 0])).toBe(2);
  });

  it('phrase de la fiche, montants masqués compris', () => {
    expect(
      activityInfo('boutique', { current: 42, previous: [28, 30, 26] }, false)
    ).toEqual({
      level: 3,
      label: 'Exceptionnel',
      text: '42 commandes payées en 30 jours (moyenne 28)',
    });
    expect(
      activityInfo('clients', { current: 1, previous: [1, 1, 1] }, false)?.text
    ).toBe('1 nouveau client en 30 jours (moyenne 1)');
    expect(
      activityInfo(
        'finance',
        { current: 12000, previous: [9000, 10000, 11000] },
        true
      )?.text
    ).toBe('••••• facturé TTC en 30 jours (moyenne •••••)');
    // Rubrique non suivie, ou donnée absente.
    expect(
      activityInfo('attributs', { current: 3, previous: [1, 1, 1] }, false)
    ).toBeNull();
    expect(activityInfo('boutique', undefined, false)).toBeNull();
  });

  it('les bâtiments reçoivent leur niveau', () => {
    const d = buildVillageData(
      {
        activity: {
          boutique: { current: 42, previous: [28, 30, 26] },
          leads: { current: 2, previous: [10, 9, 11] },
        },
      },
      NOW,
      false
    );
    expect(d.sections.boutique.activity?.level).toBe(3);
    expect(d.sections.leads.activity?.level).toBe(0);
    expect(d.sections.projets.activity).toBeNull();
  });
});

describe('ville — camions du jour', () => {
  it('un camion par livraison du jour (projets à livrer ou calendrier), 3 au plus', () => {
    const d = buildVillageData(
      {
        projects: {
          pending: 30,
          pendingPaid: 8,
          waiting: 4,
          sav: 1,
          late: 0,
          next: null,
          dueToday: 2,
        },
        shop: {
          ordersToday: 7,
          ordersPending: 6,
          productsActive: 214,
          promoUsable: 3,
        },
        calendar: [
          {
            title: 'Livraison',
            startDate: '2026-10-21T16:30:00',
            category: 'livraison',
          },
        ],
      },
      NOW,
      false
    );
    expect(d.life).toEqual({ vans: 2 });
    const calm = buildVillageData(
      {
        projects: {
          pending: 0,
          pendingPaid: 0,
          waiting: 0,
          sav: 0,
          late: 0,
          next: null,
        },
      },
      NOW,
      false
    );
    expect(calm.life).toEqual({ vans: 0 });
    const busy = buildVillageData(
      {
        projects: {
          pending: 9,
          pendingPaid: 0,
          waiting: 0,
          sav: 0,
          late: 0,
          next: null,
          dueToday: 7,
        },
      },
      NOW,
      false
    );
    expect(busy.life.vans).toBe(3);
  });
});

describe('village — caméra', () => {
  const W = 760;
  const H = Math.round(MAP_H * (W / MAP_W));
  const fit = W / MAP_W;

  it('au zoom 1, toute la carte et aucun décalage', () => {
    expect(cameraOffset(W, H, fit, 100, 100)).toEqual([0, 0]);
  });

  it('jamais de bord de carte visible', () => {
    const k = fit * 2;
    const [tx, ty] = cameraOffset(W, H, k, 0, 0);
    expect(tx).toBe(0);
    expect(ty).toBe(0);
    const [tx2, ty2] = cameraOffset(W, H, k, MAP_W, MAP_H);
    expect(tx2).toBeCloseTo(W - MAP_W * k);
    expect(ty2).toBeCloseTo(H - MAP_H * k);
    expect(clampOffset(W, H, k, 50, 50)).toEqual([0, 0]);
  });

  it('le point visé et le décalage se correspondent', () => {
    const k = fit * 1.85;
    const [tx, ty] = cameraOffset(W, H, k, 566, 458);
    const [fx, fy] = focusOf(W, H, k, tx, ty);
    expect(fx).toBeCloseTo(566);
    expect(fy).toBeCloseTo(458);
  });

  it('paliers des boutons + et −', () => {
    expect(stepZoom(1, 1)).toBe(1.4);
    expect(stepZoom(1.6, 1)).toBe(1.85);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(1.6, -1)).toBe(1.4);
    expect(stepZoom(1.4, -1)).toBe(1);
    expect(stepZoom(1, -1)).toBe(1);
  });
});
