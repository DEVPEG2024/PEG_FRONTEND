// Ville PEG — échanges entre les bâtiments : points lumineux et documents qui
// circulent au rythme des vrais chiffres ; un camion par livraison du jour.
import {
  FLOW_DEFS,
  FLOW_SPEED,
  flowDots,
  flowsOf,
  readAnimationsOn,
  villageFlows,
  writeAnimationsOn,
} from '@/views/app/admin/home/village/villageFlows';
import {
  buildVillageData,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';
import {
  MAP_H,
  MAP_W,
  blockCenter,
  exchangeCurve,
  iso,
} from '@/views/app/admin/home/village/villageScene';

/** Départ, point de contrôle et arrivée d'une courbe « M a Q c b ». */
const points = (d: string) => {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return { a: [n[0], n[1]], c: [n[2], n[3]], b: [n[4], n[5]] };
};

describe('échanges — chemins entre les bâtiments', () => {
  it('le parcours d’une commande : Boutique → Projets → Production, Projets → Finance', () => {
    expect(FLOW_DEFS.map((f) => f.id)).toEqual([
      'commandes',
      'demandes',
      'production',
      'livraisons',
      'factures',
      'tickets',
    ]);
    const route = (id: string) => {
      const e = FLOW_DEFS.find((f) => f.id === id)?.exchange;
      return e ? [e.from, e.to] : null;
    };
    expect(route('commandes')).toEqual(['boutique', 'projets']);
    expect(route('demandes')).toEqual(['clients', 'projets']);
    expect(route('production')).toEqual(['projets', 'production']);
    expect(route('factures')).toEqual(['projets', 'finance']);
    expect(route('tickets')).toEqual(['clients', 'assistance']);
    // Les livraisons roulent en camion, sans chemin.
    expect(route('livraisons')).toBeNull();
  });

  it('chaque courbe va du centre d’un îlot à celui de l’autre, sans sortir de la carte', () => {
    for (const f of FLOW_DEFS) {
      if (!f.exchange) continue;
      const { d, length } = exchangeCurve(f.exchange);
      const { a, c, b } = points(d);
      const from = iso(...blockCenter(f.exchange.from), 18);
      const to = iso(...blockCenter(f.exchange.to), 18);
      expect(a[0]).toBeCloseTo(from[0], 0);
      expect(a[1]).toBeCloseTo(from[1], 0);
      expect(b[0]).toBeCloseTo(to[0], 0);
      expect(b[1]).toBeCloseTo(to[1], 0);
      // La courbe reste dans le triangle départ-contrôle-arrivée.
      for (const [x, y] of [a, c, b]) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(MAP_W);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(MAP_H);
      }
      expect(length).toBeGreaterThan(Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
  });

  it('bombé positif vers le haut de l’écran, négatif vers le bas', () => {
    const up = points(
      exchangeCurve({ from: 'boutique', to: 'projets', arc: 60 }).d
    );
    const down = points(
      exchangeCurve({ from: 'boutique', to: 'projets', arc: -60 }).d
    );
    const midY = (p: typeof up) => (p.a[1] + p.b[1]) / 2;
    expect(up.c[1]).toBeLessThan(midY(up));
    expect(down.c[1]).toBeGreaterThan(midY(down));
  });
});

describe('échanges — plus PEG tourne, plus ça circule', () => {
  it('jetons : racine du volume ; 6 points ou 3 documents au plus', () => {
    expect(flowDots(null)).toBe(0);
    expect(flowDots(undefined)).toBe(0);
    expect(flowDots(0)).toBe(0);
    expect(flowDots(-3)).toBe(0);
    expect(flowDots(1)).toBe(1);
    expect(flowDots(4)).toBe(2);
    expect(flowDots(9)).toBe(4);
    expect(flowDots(42)).toBe(6);
    expect(flowDots(5000)).toBe(6);
    expect(flowDots(1, 'doc')).toBe(1);
    expect(flowDots(42, 'doc')).toBe(3);
  });

  it('un chiffre illisible : ni jeton ni nombre, jamais un faux 0', () => {
    const flows = villageFlows({
      commandes: 42,
      livraisons: 6,
      factures: Number.NaN,
    });
    expect(flows.map((f) => [f.id, f.count, f.dots])).toEqual([
      ['commandes', 42, 6],
      ['demandes', null, 0],
      ['production', null, 0],
      ['livraisons', 6, 0],
      ['factures', null, 0],
      ['tickets', null, 0],
    ]);
    for (const f of flows) {
      if (!f.exchange) {
        expect(f.d).toBe('');
        continue;
      }
      expect(f.d.startsWith('M')).toBe(true);
      expect(f.duration).toBeCloseTo(Math.max(2.8, f.length / FLOW_SPEED), 6);
    }
  });

  it('les échanges d’un quartier (aperçu au survol)', () => {
    const flows = villageFlows({});
    const ids = (d: Parameters<typeof flowsOf>[1]) =>
      flowsOf(flows, d).map((f) => f.id);
    expect(ids('projets')).toEqual([
      'commandes',
      'demandes',
      'production',
      'factures',
    ]);
    expect(ids('clients')).toEqual(['demandes', 'tickets']);
    expect(ids('assistance')).toEqual(['tickets']);
    expect(ids('production')).toEqual(['production']);
  });

  it('volumes lus avec la ville : les vrais chiffres de chaque échange', () => {
    const NOW = new Date('2026-10-22T10:00:00');
    const raw: RawVillage = {
      projects: {
        pending: 3,
        pendingPaid: 1,
        waiting: 0,
        sav: 0,
        late: 0,
        next: null,
        dueNext7: [1, 0, 2, 0, 0, 3, 0],
      },
      activity: { boutique: { current: 42, previous: [30, 28, 31] } },
      quotes: { proposed: 1, requested: 2, requestedStale: 0 },
      tickets: { open: 5, stale: 0 },
      invoices: {
        total: 5,
        unpaid: [
          { documentId: 'a', name: 'FAC-1', totalAmount: 100 },
          { documentId: 'b', name: 'FAC-2', totalAmount: 200 },
        ],
      },
    };
    expect(buildVillageData(raw, NOW, false).flowCounts).toEqual({
      commandes: 42,
      demandes: 2,
      production: 4,
      livraisons: 6,
      factures: 2,
      tickets: 5,
    });
    expect(buildVillageData({}, NOW, false).flowCounts).toEqual({
      commandes: null,
      demandes: null,
      production: null,
      livraisons: null,
      factures: null,
      tickets: null,
    });
  });
});

describe('animations — l’interrupteur, retenu sur l’appareil', () => {
  const g = globalThis as {
    localStorage?: Pick<Storage, 'getItem' | 'setItem'>;
  };
  afterEach(() => {
    delete g.localStorage;
  });

  it('activées par défaut ; le choix est retenu', () => {
    const store = new Map<string, string>();
    g.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, String(v));
      },
    };
    expect(readAnimationsOn()).toBe(true);
    writeAnimationsOn(false);
    expect(store.get('peg:villageAnimations')).toBe('off');
    expect(readAnimationsOn()).toBe(false);
    writeAnimationsOn(true);
    expect(readAnimationsOn()).toBe(true);
  });

  it('sans stockage (navigation privée) : activées, et rien ne casse', () => {
    expect(readAnimationsOn()).toBe(true);
    expect(() => writeAnimationsOn(false)).not.toThrow();
  });
});
