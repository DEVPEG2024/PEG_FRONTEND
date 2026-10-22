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
  BOULEVARDS,
  GRID,
  MENU_ORDER,
  blockCenter,
  doorOf,
  routeLength,
} from '@/views/app/admin/home/village/villageScene';

describe('échanges — par les rues, d’un bâtiment à l’autre', () => {
  it('le parcours d’une commande : Boutique → Projets → Producteurs, Projets → Finance', () => {
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
    expect(route('demandes')).toEqual(['clients', 'devis']);
    expect(route('production')).toEqual(['projets', 'producteurs']);
    expect(route('factures')).toEqual(['projets', 'finance']);
    expect(route('tickets')).toEqual(['clients', 'tickets']);
    // Les livraisons roulent en camion, sans chemin.
    expect(route('livraisons')).toBeNull();
  });

  it('chaque trajet va d’une porte à l’autre par les boulevards, jamais à travers un quartier', () => {
    for (const f of villageFlows({})) {
      if (!f.exchange) {
        expect(f.route).toEqual([]);
        continue;
      }
      expect(f.route[0]).toEqual(doorOf(f.exchange.from));
      expect(f.route[f.route.length - 1]).toEqual(doorOf(f.exchange.to));
      for (let k = 1; k < f.route.length; k++) {
        const [u1, v1] = f.route[k - 1];
        const [u2, v2] = f.route[k];
        // Un segment suit un boulevard : sa coordonnée fixe est la sienne, dans la ville.
        const fixed = u1 === u2 ? u1 : v1 === v2 ? v1 : NaN;
        expect({
          flow: f.id,
          k,
          onBoulevard: BOULEVARDS.includes(fixed),
        }).toEqual({ flow: f.id, k, onBoulevard: true });
        for (const x of [u1, v1, u2, v2]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(GRID);
        }
      }
      expect(f.d.startsWith('M')).toBe(true);
      expect(f.length).toBeCloseTo(routeLength(f.route), 6);
      expect(f.length).toBeGreaterThan(0);
    }
  });

  it('la porte d’un bâtiment donne sur le boulevard le plus proche', () => {
    for (const id of MENU_ORDER) {
      const [u, v] = doorOf(id);
      const [cu, cv] = blockCenter(id);
      const onU = BOULEVARDS.includes(u);
      expect(onU || BOULEVARDS.includes(v)).toBe(true);
      // On sort tout droit du bâtiment jusqu'au boulevard, à moins d'un îlot.
      expect(onU ? v : u).toBeCloseTo(onU ? cv : cu, 9);
      expect(Math.abs(onU ? u - cu : v - cv)).toBeLessThanOrEqual(1);
    }
    expect(doorOf('projets')[0]).toBe(2.5);
    expect(doorOf('boutique')[1]).toBe(5.5);
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

  it('les échanges d’un bâtiment (aperçu au survol)', () => {
    const flows = villageFlows({});
    const ids = (d: Parameters<typeof flowsOf>[1]) =>
      flowsOf(flows, d).map((f) => f.id);
    expect(ids('projets')).toEqual(['commandes', 'production', 'factures']);
    expect(ids('clients')).toEqual(['demandes', 'tickets']);
    expect(ids('tickets')).toEqual(['tickets']);
    expect(ids('producteurs')).toEqual(['production']);
    expect(ids('devis')).toEqual(['demandes']);
    expect(ids('ia')).toEqual([]);
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
