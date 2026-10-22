// Village PEG — flux d'activité : les rues en fibres optiques, des points de
// lumière qui suivent le parcours d'une commande, au rythme des vrais chiffres.
import {
  FLOW_DEFS,
  FLOW_SPEED,
  flowDots,
  flowPath,
  villageFlows,
} from '@/views/app/admin/home/village/villageFlows';
import {
  buildVillageData,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';
import {
  CHANTIER,
  LAYOUT,
  toMap,
} from '@/views/app/admin/home/village/villageScene';

const occupied = new Set([...LAYOUT, CHANTIER].map((c) => `${c.u},${c.v}`));
const has = (u: number, v: number) => occupied.has(`${u},${v}`);
/** Cases longées par un segment de a à b (une case va de n − ½ à n + ½). */
const cellFrom = (a: number, b: number) => Math.round(Math.min(a, b) + 1e-6);
const cellTo = (a: number, b: number) => Math.round(Math.max(a, b) - 1e-6);
/** Proche d'une rue : un demi-entier, à une voie près (±0,06). */
const onStreetLine = (x: number) => Math.abs(x - (Math.floor(x) + 0.5)) <= 0.06;

describe('flux — trajets le long des rues', () => {
  it('chaque segment longe une rue bordée de bâtiments des deux côtés', () => {
    for (const f of FLOW_DEFS) {
      for (let i = 1; i < f.route.length; i++) {
        const [u1, v1] = f.route[i - 1];
        const [u2, v2] = f.route[i];
        const alongV = u1 === u2;
        const alongU = v1 === v2;
        // Jamais en diagonale (à travers une parcelle).
        expect({ flow: f.id, i, straight: alongU || alongV }).toEqual({
          flow: f.id,
          i,
          straight: true,
        });
        if (alongV) {
          // Rue « u = k + ½ » : cases de part et d'autre, sur toute la longueur.
          expect(onStreetLine(u1)).toBe(true);
          const left = Math.floor(u1);
          for (let v = cellFrom(v1, v2); v <= cellTo(v1, v2); v++) {
            expect({
              flow: f.id,
              at: [u1, v],
              sides: [has(left, v), has(left + 1, v)],
            }).toEqual({
              flow: f.id,
              at: [u1, v],
              sides: [true, true],
            });
          }
        } else {
          expect(onStreetLine(v1)).toBe(true);
          const back = Math.floor(v1);
          for (let u = cellFrom(u1, u2); u <= cellTo(u1, u2); u++) {
            expect({
              flow: f.id,
              at: [u, v1],
              sides: [has(u, back), has(u, back + 1)],
            }).toEqual({
              flow: f.id,
              at: [u, v1],
              sides: [true, true],
            });
          }
        }
      }
    }
  });

  it('commande → atelier → livraison · facture : les trajets s’enchaînent à l’Atelier', () => {
    const [commandes, livraisons, factures] = FLOW_DEFS;
    const atelier = (p: [number, number]) =>
      Math.abs(p[0] - 1.5) <= 0.06 && p[1] === 2;
    expect(atelier(commandes.route[commandes.route.length - 1])).toBe(true);
    expect(atelier(livraisons.route[0])).toBe(true);
    expect(atelier(factures.route[0])).toBe(true);
    // La facture arrive à la porte de la Finance (case 2, 2).
    expect(factures.route[factures.route.length - 1]).toEqual([2, 2.45]);
  });

  it('chemin SVG et longueur en pixels de carte', () => {
    const { d, length } = flowPath([
      [1, 2],
      [2, 2],
    ]);
    const [x1, y1] = toMap(1, 2);
    const [x2, y2] = toMap(2, 2);
    expect(d).toBe(
      `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`
    );
    expect(length).toBeCloseTo(Math.hypot(x2 - x1, y2 - y1), 6);
  });
});

describe('flux — plus PEG tourne, plus ça circule', () => {
  it('points de lumière : racine du volume, de 1 à 9', () => {
    expect(flowDots(null)).toBe(0);
    expect(flowDots(undefined)).toBe(0);
    expect(flowDots(0)).toBe(0);
    expect(flowDots(-3)).toBe(0);
    expect(flowDots(1)).toBe(2);
    expect(flowDots(4)).toBe(3);
    expect(flowDots(8)).toBe(4);
    expect(flowDots(42)).toBe(9);
    expect(flowDots(5000)).toBe(9);
  });

  it('un chiffre illisible : ni point ni nombre, jamais un faux 0', () => {
    const flows = villageFlows({ commandes: 42, livraisons: null });
    expect(flows.map((f) => [f.id, f.count, f.dots])).toEqual([
      ['commandes', 42, 9],
      ['livraisons', null, 0],
      ['factures', null, 0],
    ]);
    for (const f of flows) {
      expect(f.d.startsWith('M')).toBe(true);
      expect(f.length).toBeGreaterThan(0);
      expect(f.duration).toBeCloseTo(Math.max(2.5, f.length / FLOW_SPEED), 6);
    }
    expect(villageFlows({ factures: Number.NaN })[2].count).toBeNull();
  });

  it('volumes lus avec le village : commandes 30 j, livraisons 7 j, factures à encaisser', () => {
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
      livraisons: 6,
      factures: 2,
    });
    expect(buildVillageData({}, NOW, false).flowCounts).toEqual({
      commandes: null,
      livraisons: null,
      factures: null,
    });
  });
});
