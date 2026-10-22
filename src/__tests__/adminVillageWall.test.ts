// Village PEG — écran mural : tour des quartiers, légendes, fil des
// évènements, mise à l'échelle sur une télévision.
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  TONE,
  emptySection,
  type SectionData,
} from '@/views/app/admin/home/village/villageModel';
import {
  DISTRICTS,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  membersOf,
  type SectionId,
} from '@/views/app/admin/home/village/villageScene';
import {
  WALL_ALERT_MS,
  WALL_DISTRICT_MS,
  WALL_OVERVIEW_MS,
  districtLines,
  fitMap,
  stopDuration,
  tickerItems,
  tickerTime,
  wallScale,
  wallStops,
} from '@/views/app/admin/home/village/villageWallTour';

dayjs.locale('fr');
const NOW = new Date('2026-10-22T10:00:00');

const sections = (
  over: Partial<Record<SectionId, Partial<SectionData>>> = {}
): Record<SectionId, SectionData> =>
  Object.fromEntries(
    MENU_ORDER.map((id) => [
      id,
      { ...emptySection(`Rien pour ${id}`), ...(over[id] ?? {}) },
    ])
  ) as Record<SectionId, SectionData>;

describe('écran mural — tour des quartiers', () => {
  it('vue d’ensemble, puis chaque quartier dans l’ordre de la carte', () => {
    const stops = wallStops();
    expect(stops[0]).toEqual({ kind: 'overview' });
    expect(stops.slice(1)).toEqual(
      DISTRICTS.map((d) => ({ kind: 'district', id: d.id }))
    );
  });

  it('un quartier en alerte reste plus longtemps à l’écran', () => {
    const s = sections({ finance: { alert: '1 facture impayée' } });
    expect(stopDuration({ kind: 'overview' }, s)).toBe(WALL_OVERVIEW_MS);
    expect(stopDuration({ kind: 'district', id: 'finance' }, s)).toBe(
      WALL_ALERT_MS
    );
    expect(stopDuration({ kind: 'district', id: 'clients' }, s)).toBe(
      WALL_DISTRICT_MS
    );
    expect(stopDuration({ kind: 'district', id: 'clients' }, {})).toBe(
      WALL_DISTRICT_MS
    );
  });
});

describe('écran mural — légende d’un quartier', () => {
  it('alertes d’abord, puis ce qui demande une action, ordre du menu sinon', () => {
    const s = sections({
      devis: { attention: true, chip: '1 devis à préparer' },
      finance: {
        alert: '1 facture impayée depuis plus de 30 jours.',
        chip: '3 factures en retard',
        badge: '3',
        tone: TONE.orange,
      },
      generateurs: { chip: '2 commissions à valider' },
    });
    const lines = districtLines('finance', s);
    expect(lines.map((l) => l.id)).toEqual(['finance', 'devis', 'generateurs']);
    expect(lines[0]).toEqual({
      id: 'finance',
      text: '1 facture impayée depuis plus de 30 jours.',
      alert: true,
      badge: '3',
    });
    expect(lines[1]).toMatchObject({
      text: '1 devis à préparer',
      alert: false,
    });
    // Une ligne par bâtiment du quartier, toujours.
    for (const d of DISTRICTS)
      expect(districtLines(d.id, s)).toHaveLength(membersOf(d.id).length);
  });

  it('rubrique illisible : « Données indisponibles », jamais un trou', () => {
    const lines = districtLines('clients', {});
    expect(lines.every((l) => l.text === 'Données indisponibles')).toBe(true);
    expect(lines.map((l) => l.id)).toEqual(membersOf('clients'));
  });
});

describe('écran mural — fil des évènements', () => {
  it('heure du jour, « hier », sinon la date', () => {
    expect(tickerTime('2026-10-22T08:05:00', NOW)).toBe('08:05');
    expect(tickerTime('2026-10-21T17:40:00', NOW)).toBe('hier 17:40');
    expect(tickerTime('2026-10-19T09:00:00', NOW)).toBe('lun. 19 oct.');
  });

  it('les plus récentes d’abord, titre seul, bâtiment retrouvé', () => {
    const items = tickerItems(
      [
        {
          _id: 1,
          eventType: 'new_order',
          title: 'Nouvelle commande',
          createdAt: '2026-10-22T08:00:00',
        },
        {
          _id: 3,
          eventType: 'new_ticket',
          title: '  Nouveau ticket  ',
          link: '/admin/tickets/9',
          createdAt: '2026-10-22T09:30:00',
        },
        {
          _id: 2,
          eventType: 'inconnu',
          createdAt: '2026-10-21T18:00:00',
        },
        { _id: 4, eventType: 'new_order', title: 'Sans date' },
        {
          _id: 5,
          eventType: 'new_order',
          title: 'Date illisible',
          createdAt: 'n/a',
        },
      ],
      NOW
    );
    expect(items).toEqual([
      { key: '3', time: '09:30', text: 'Nouveau ticket', section: 'tickets' },
      {
        key: '1',
        time: '08:00',
        text: 'Nouvelle commande',
        section: 'boutique',
      },
      {
        key: '2',
        time: 'hier 18:00',
        text: 'Nouvelle activité',
        section: null,
      },
    ]);
    const many = Array.from({ length: 20 }, (_, i) => ({
      _id: i,
      eventType: 'new_order',
      createdAt: new Date(NOW.getTime() - i * 60_000).toISOString(),
    }));
    expect(tickerItems(many, NOW)).toHaveLength(12);
  });
});

describe('écran mural — taille sur la télévision', () => {
  it('échelle 1 en 1920 × 1080, 2 en 4K, jamais trop petite', () => {
    expect(wallScale(1920, 1080)).toBe(1);
    expect(wallScale(3840, 2160)).toBe(2);
    expect(wallScale(1280, 720)).toBeCloseTo(0.667, 3);
    expect(wallScale(1920, 1200)).toBe(1);
    expect(wallScale(800, 480)).toBe(0.6);
  });

  it('la carte remplit son cadre en rognant les coins du trottoir, sinon tient entière', () => {
    // Le cadre de l'écran 1920 × 1080 : rempli (ni bande vide ni bord coupé net).
    const tv = fitMap(1188, 868);
    expect(tv.w).toBe(Math.ceil((868 * MAP_W) / MAP_H));
    expect(tv.w).toBeLessThanOrEqual(1188 * 1.18);
    expect(tv.h).toBeGreaterThanOrEqual(868);
    // Cadre plus large que la carte : rempli en largeur.
    const near = fitMap(1188, 720);
    expect(near.w).toBe(1188);
    expect(near.h).toBeGreaterThanOrEqual(720);
    // Cadre très haut ou très large : il faudrait trop rogner, elle tient entière.
    const tall = fitMap(1200, 2000);
    expect(tall.w).toBe(1200);
    expect(tall.h).toBeLessThanOrEqual(2000);
    const wide = fitMap(2000, 850);
    expect(wide.w).toBe(Math.ceil((850 * MAP_W) / MAP_H));
    expect(wide.h).toBeLessThanOrEqual(851);
    expect(fitMap(0, 0)).toEqual({ w: 0, h: 0 });
  });
});
