// « PEG DISTRICTS » (accueil admin) : la ville est une image, les repères sont
// posés dessus. Chaque quartier a sa carte, les sites de production sont des
// rubriques de la Production, tout reste dans l'image ; le cadrage remplit
// toujours le cadre et le zoom garde le point visé.
import {
  CARD_H,
  CITY_IMAGE,
  CONVEYOR,
  CONVEYOR_SHORT,
  DELIVERY_ROUTE,
  DISTRICT_SPOTS,
  DISTRICT_ZOOM_MAX,
  PRODUCTION_SITES,
  ROADS,
  ROOFS,
  WATERWAYS,
  arcPath,
  cardWidth,
  cityCamera,
  compactFrame,
  districtLine,
  focusOfCamera,
  keepInside,
  placeDistrictCards,
  readCount,
  smoothPath,
  spreadCards,
  toFrame,
  toImage,
} from '@/views/app/admin/home/village/districtsScene';
import { FLOW_DEFS } from '@/views/app/admin/home/village/villageFlows';
import {
  DISTRICTS,
  membersOf,
} from '@/views/app/admin/home/village/villageScene';
import type { VillageData } from '@/views/app/admin/home/village/villageModel';

const inImage = ([x, y]: [number, number]) =>
  x >= 0 && x <= CITY_IMAGE.w && y >= 0 && y <= CITY_IMAGE.h;

describe('PEG DISTRICTS — les repères sur la ville', () => {
  it('une carte par quartier, posée sur l’image', () => {
    expect(DISTRICT_SPOTS.map((s) => s.id).sort()).toEqual(
      DISTRICTS.map((d) => d.id).sort()
    );
    for (const s of DISTRICT_SPOTS) {
      expect({ id: s.id, card: inImage(s.card) }).toEqual({
        id: s.id,
        card: true,
      });
      expect({ id: s.id, glow: inImage(s.glow) }).toEqual({
        id: s.id,
        glow: true,
      });
      expect(s.radius).toBeGreaterThan(0);
    }
  });

  it('les trois sites numérotés sont les rubriques de la Production', () => {
    expect(PRODUCTION_SITES.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(PRODUCTION_SITES.map((s) => s.id).sort()).toEqual(
      [...membersOf('production')].sort()
    );
    for (const s of PRODUCTION_SITES) expect(inImage(s.at)).toBe(true);
  });

  it('la ligne de production reste dans l’image', () => {
    for (const p of [...CONVEYOR, ...CONVEYOR_SHORT])
      expect(inImage(p)).toBe(true);
    expect(CONVEYOR.length).toBeGreaterThan(2);
  });
});

describe('PEG DISTRICTS — le réseau et la vie de la ville', () => {
  it('chaque échange entre bâtiments a ses deux pôles, sur l’image', () => {
    for (const f of FLOW_DEFS) {
      if (!f.exchange) continue;
      const a = ROOFS[f.exchange.from];
      const b = ROOFS[f.exchange.to];
      expect({
        flow: f.id,
        from: !!a && inImage(a),
        to: !!b && inImage(b),
      }).toEqual({ flow: f.id, from: true, to: true });
    }
  });

  it('un arc part d’un pôle, arrive à l’autre et monte au-dessus des toits', () => {
    const d = arcPath([338, 190], [1365, 632]);
    const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(n.slice(0, 2)).toEqual([338, 190]);
    expect(n.slice(-2)).toEqual([1365, 632]);
    expect(n[3]).toBeLessThan((190 + 632) / 2);
  });

  it('routes, voies d’eau et route des livraisons restent dans l’image', () => {
    for (const r of [...ROADS, ...WATERWAYS]) {
      expect(r.pts.length).toBeGreaterThan(1);
      for (const p of r.pts)
        expect({ id: r.id, p, in: inImage(p) }).toEqual({
          id: r.id,
          p,
          in: true,
        });
    }
    for (const p of DELIVERY_ROUTE) expect(inImage(p)).toBe(true);
    expect(new Set(ROADS.map((r) => r.id)).size).toBe(ROADS.length);
  });

  it('un tracé lissé passe par le premier et le dernier point, une courbe par tronçon', () => {
    const pts: [number, number][] = [
      [0, 0],
      [100, 50],
      [200, 40],
    ];
    const d = smoothPath(pts);
    expect(d.startsWith('M0 0 C')).toBe(true);
    expect(d.endsWith(' 200 40')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(d).toContain(' 100 50 C');
  });
});

describe('PEG DISTRICTS — cadrage', () => {
  const frames: [number, number][] = [
    [1258, 705],
    [1092, 612],
    [720, 440],
    [644, 440],
    [1600, 520],
  ];

  it('l’image remplit toujours le cadre, quels que soient le zoom et le point visé', () => {
    for (const [w, h] of frames)
      for (const zoom of [0.5, 1, 1.4, 2.2, 5])
        for (const focus of [
          undefined,
          [0, 0] as [number, number],
          [CITY_IMAGE.w, CITY_IMAGE.h] as [number, number],
          [400, 900] as [number, number],
        ]) {
          const c = cityCamera(w, h, zoom, focus);
          expect(c.tx).toBeLessThanOrEqual(1e-9);
          expect(c.ty).toBeLessThanOrEqual(1e-9);
          expect(c.tx + CITY_IMAGE.w * c.k).toBeGreaterThanOrEqual(w - 1e-6);
          expect(c.ty + CITY_IMAGE.h * c.k).toBeGreaterThanOrEqual(h - 1e-6);
        }
  });

  it('le zoom reste entre 1 et son maximum', () => {
    const base = cityCamera(1092, 612, 1).k;
    expect(cityCamera(1092, 612, 0.2).k).toBeCloseTo(base, 9);
    expect(cityCamera(1092, 612, 9).k).toBeCloseTo(base * DISTRICT_ZOOM_MAX, 9);
  });

  it('toFrame et toImage sont inverses ; le point visé est au centre quand c’est possible', () => {
    const c = cityCamera(1092, 612, 2, [800, 450]);
    for (const p of [
      [0, 0],
      [800, 450],
      [1500, 900],
    ] as [number, number][]) {
      const back = toImage(c, toFrame(c, p));
      expect(back[0]).toBeCloseTo(p[0], 9);
      expect(back[1]).toBeCloseTo(p[1], 9);
    }
    const [fx, fy] = focusOfCamera(c, 1092, 612);
    expect(fx).toBeCloseTo(800, 6);
    expect(fy).toBeCloseTo(450, 6);
  });

  it('une carte reste entière dans le cadre', () => {
    for (const p of [
      [-50, -50],
      [2000, 30],
      [600, 400],
      [10, 900],
    ] as [number, number][]) {
      const [x, y] = keepInside(p, 238, 60, 1092, 612);
      expect(x - 119).toBeGreaterThanOrEqual(12);
      expect(x + 119).toBeLessThanOrEqual(1092 - 12);
      expect(y - 30).toBeGreaterThanOrEqual(12);
      expect(y + 30).toBeLessThanOrEqual(612 - 12);
    }
    // Déjà à l'intérieur : elle ne bouge pas.
    expect(keepInside([600, 400], 238, 60, 1092, 612)).toEqual([600, 400]);
  });

  type P = [number, number];
  const hits = (a: P, aw: number, ah: number, b: P, bw: number, bh: number) =>
    Math.abs(a[0] - b[0]) < (aw + bw) / 2 - 0.5 &&
    Math.abs(a[1] - b[1]) < (ah + bh) / 2 - 0.5;

  it('au zoom comme en cadre étroit, les cartes ne recouvrent ni une autre carte ni un site', () => {
    for (const [w, h] of frames)
      for (const zoom of [1, 1.4, 1.8, 2.2])
        for (const focus of [
          undefined,
          [600, 820] as P,
          [300, 200] as P,
          [1400, 700] as P,
          [860, 600] as P,
        ]) {
          const c = cityCamera(w, h, zoom, focus);
          const cw = cardWidth(w);
          const at = placeDistrictCards(c, w, h);
          const sites = PRODUCTION_SITES.map((s) => toFrame(c, s.at))
            .map(([x, y]) => [x + 61, y] as P)
            .filter(([x, y]) => x > 0 && x < w && y > 0 && y < h);
          at.forEach(([x, y], i) => {
            const where = { w, h, zoom, focus, card: DISTRICT_SPOTS[i].id };
            expect({
              ...where,
              inside:
                x - cw / 2 >= 12 - 1e-6 &&
                x + cw / 2 <= w - 12 + 1e-6 &&
                y - CARD_H / 2 >= 12 - 1e-6 &&
                y + CARD_H / 2 <= h - 12 + 1e-6,
            }).toEqual({ ...where, inside: true });
            at.slice(i + 1).forEach((b, k) =>
              expect({
                ...where,
                other: DISTRICT_SPOTS[i + 1 + k].id,
                hit: hits([x, y], cw, CARD_H, b, cw, CARD_H),
              }).toEqual({
                ...where,
                other: DISTRICT_SPOTS[i + 1 + k].id,
                hit: false,
              })
            );
            sites.forEach((p, k) =>
              expect({
                ...where,
                site: k,
                hit: hits([x, y], cw, CARD_H, p, 150, 28),
              }).toEqual({ ...where, site: k, hit: false })
            );
          });
        }
  });

  it('sur un grand écran, à 100 %, chaque carte reste sur son bâtiment', () => {
    for (const [w, h] of [
      [1209, 677],
      [1044, 585],
      [1258, 705],
    ] as P[]) {
      const c = cityCamera(w, h, 1);
      expect(placeDistrictCards(c, w, h)).toEqual(
        DISTRICT_SPOTS.map((s) => keepInside(toFrame(c, s.card), 238, 60, w, h))
      );
    }
  });

  it('sans chevauchement, les cartes restent où elles sont', () => {
    const pts: P[] = [
      [200, 100],
      [600, 100],
      [400, 400],
    ];
    expect(spreadCards(pts, 238, 60, 1092, 612)).toEqual(pts);
  });

  it('un cadre étroit resserre les cartes pour en aligner trois', () => {
    expect(compactFrame(677)).toBe(true);
    expect(compactFrame(1044)).toBe(false);
    expect(3 * cardWidth(662) + 2 * 10 + 2 * 12).toBeLessThanOrEqual(662);
    expect(cardWidth(1209)).toBe(238);
  });
});

describe('PEG DISTRICTS — les chiffres des cartes', () => {
  const data = {
    kpis: { projectsInProgress: 38 },
    sections: {
      clients: { stats: [{ label: 'Clients', value: '64' }] },
      boutique: { stats: [{ label: 'Produits actifs', value: '1 214' }] },
      producteurs: { stats: [{ label: 'Producteurs', value: '1' }] },
      finance: { stats: [{ label: 'Factures à régler', value: '—' }] },
      tickets: { stats: [{ label: 'Ouverts', value: '0' }] },
    },
  } as unknown as VillageData;

  it('un vrai chiffre par quartier, au singulier comme au pluriel', () => {
    expect(districtLine('clients', data, false)).toBe('64 clients');
    expect(districtLine('projets', data, false)).toBe('38 projets en cours');
    expect(districtLine('boutique', data, false)).toBe('1214 produits actifs');
    expect(districtLine('production', data, false)).toBe('1 producteur');
    expect(districtLine('assistance', data, false)).toBe('0 ticket ouvert');
  });

  it('un chiffre illisible ne devient jamais un faux 0', () => {
    expect(readCount('—')).toBeNull();
    expect(readCount(undefined)).toBeNull();
    expect(readCount(Number.NaN)).toBeNull();
    expect(readCount('1 234')).toBe(1234);
    expect(districtLine('finance', data, false)).toBe('Chiffres indisponibles');
    expect(districtLine('clients', null, true)).toBe('Chargement…');
    expect(districtLine('clients', null, false)).toBe('Chiffres indisponibles');
  });
});
