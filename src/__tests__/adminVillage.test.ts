// Ville PEG (tableau de bord admin) : invariants de la scène.
// Un bâtiment par onglet du menu, chacun sur son îlot ; six quartiers de
// 2 × 2 îlots écartés par des boulevards plantés ; la place au centre, le
// bois et le parc ; arbres, passants, vélos, voitures et camions hors des
// bâtiments ; étiquettes qui ne se chevauchent jamais.
import {
  BENCHES,
  BLOCK,
  BOULEVARDS,
  BUILDINGS,
  BUSHES,
  CARS,
  CITY_EDGE,
  CYCLISTS,
  DISTRICTS,
  DUCKS,
  FLOWERS,
  FOUNTAIN,
  GRID,
  LANE,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  PLAZA,
  POND,
  PRIMARY,
  QUADS,
  ROAD,
  SLIM_BELOW,
  SPOTS,
  TREES,
  TRUCK_ROUTE,
  WALKERS,
  buildingCenter,
  buildingFrame,
  districtOf,
  footprint,
  iso,
  labelAnchor,
  labelWidth,
  membersOf,
  placeLabels,
  plotOf,
  slimLabelWidth,
  type LabelBox,
  type SectionId,
} from '@/views/app/admin/home/village/villageScene';
import { SECTION_INFO } from '@/views/app/admin/home/village/villageSections';

const IDS = DISTRICTS.map((d) => d.id);
const key = ([i, j]: [number, number]) => `${i},${j}`;
/** (u, v) dans une emprise, agrandie de m. */
const inside = (
  u: number,
  v: number,
  [u0, v0, u1, v1]: [number, number, number, number],
  m = 0
) => u > u0 - m && u < u1 + m && v > v0 - m && v < v1 + m;
/** Distance au boulevard le plus proche (milieu de sa chaussée). */
const toBoulevard = (x: number) =>
  Math.min(...BOULEVARDS.map((b) => Math.abs(x - b)));
/** Le carré de 2 × 2 îlots d'un quartier, de la place, d'un parc. */
const quadOf = (kind: string) =>
  (QUADS.find((q) => q.kind === kind) as (typeof QUADS)[number]).q;
const inQuad = ([i, j]: [number, number], [qu, qv]: [number, number]) =>
  i >= qu && i < qu + 2 && j >= qv && j < qv + 2;
/** Les carrés des six quartiers (leurs allées en croix passent par leur milieu). */
const DISTRICT_QUADS = IDS.map((d) => quadOf(d));
/** Points d'un trajet, tous les 2 % de chaque segment. */
const along = (pts: [number, number][]) =>
  pts.slice(1).flatMap((b, k) => {
    const a = pts[k];
    return Array.from({ length: 51 }, (_, i): [number, number] => [
      a[0] + ((b[0] - a[0]) * i) / 50,
      a[1] + ((b[1] - a[1]) * i) / 50,
    ]);
  });
/** Coordonnée fixe d'un segment droit (NaN s'il est en biais). */
const fixedOf = ([a, b]: [number, number][]) =>
  a[0] === b[0] ? a[0] : a[1] === b[1] ? a[1] : NaN;

describe('ville PEG — un bâtiment par onglet du menu', () => {
  it('vingt bâtiments, chacun sur son îlot, dans le carré de son quartier', () => {
    expect(Object.keys(BLOCK).sort()).toEqual([...MENU_ORDER].sort());
    // Neuf carrés : six quartiers, la place au centre, deux parcs.
    expect(QUADS.map((q) => q.kind).sort()).toEqual(
      [...IDS, 'parc', 'parc', 'place'].sort()
    );
    expect(PLAZA).toEqual([3, 3]);
    expect(quadOf('place')).toEqual(PLAZA);
    const cells = [
      ...MENU_ORDER.map((id) => BLOCK[id]),
      ...SPOTS.map((s) => s.cell),
    ];
    expect(new Set(cells.map(key)).size).toBe(cells.length);
    for (const id of MENU_ORDER)
      expect({ id, home: inQuad(BLOCK[id], quadOf(districtOf(id))) }).toEqual({
        id,
        home: true,
      });
    // Chaque quartier remplit son carré : ses bâtiments, au besoin un jardin,
    // la cour des ateliers ou la terrasse de café.
    for (const d of IDS)
      expect(cells.filter((c) => inQuad(c, quadOf(d)))).toHaveLength(4);
    // Aucun îlot sur un boulevard (colonnes et rangées 2 et 5).
    for (const [i, j] of cells) {
      expect(i % 3).not.toBe(2);
      expect(j % 3).not.toBe(2);
    }
  });

  it('six quartiers ; chaque onglet dans un seul, dans l’ordre du menu', () => {
    expect(DISTRICTS.map((d) => d.name)).toEqual([
      'Projets',
      'Clients',
      'Boutique',
      'Production',
      'Finance',
      'Assistance',
    ]);
    const all = IDS.flatMap((d) => membersOf(d));
    expect([...all].sort()).toEqual([...MENU_ORDER].sort());
    for (const id of MENU_ORDER)
      expect(membersOf(districtOf(id))).toContain(id);
    for (const d of IDS) {
      expect(membersOf(d)).toContain(PRIMARY[d]);
      const m = membersOf(d);
      expect(m).toEqual(
        [...m].sort((a, b) => MENU_ORDER.indexOf(a) - MENU_ORDER.indexOf(b))
      );
    }
    for (const d of DISTRICTS)
      for (const c of [d.hue, d.ink, d.soft, d.ground])
        expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('un quartier = des îlots voisins, d’un seul tenant', () => {
    for (const d of IDS) {
      const cells = membersOf(d).map((id) => BLOCK[id]);
      const seen = new Set([key(cells[0])]);
      const todo = [cells[0]];
      while (todo.length) {
        const [i, j] = todo.pop() as [number, number];
        for (const [di, dj] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = cells.find((c) => c[0] === i + di && c[1] === j + dj);
          if (n && !seen.has(key(n))) {
            seen.add(key(n));
            todo.push(n);
          }
        }
      }
      expect({ d, contiguous: seen.size }).toEqual({
        d,
        contiguous: cells.length,
      });
    }
  });

  it('Projets au bord de la place, sa tour en chantier domine la ville', () => {
    const [qu, qv] = quadOf('projets');
    expect(Math.abs(qu - PLAZA[0]) + Math.abs(qv - PLAZA[1])).toBe(3);
    const tall = (id: SectionId) => BUILDINGS[id].h + BUILDINGS[id].top;
    for (const id of MENU_ORDER)
      if (id !== 'projets') {
        expect(BUILDINGS.projets.h).toBeGreaterThan(BUILDINGS[id].h);
        expect(tall('projets')).toBeGreaterThan(tall(id));
      }
  });
});

describe('ville PEG — plan', () => {
  it('chaque bâtiment tient dans sa parcelle, en retrait des allées et des boulevards', () => {
    for (const id of MENU_ORDER) {
      const [u0, v0, u1, v1] = footprint(id);
      const [p0, q0, p1, q1] = plotOf(...BLOCK[id]);
      expect(u0).toBeGreaterThanOrEqual(p0 + 0.1);
      expect(v0).toBeGreaterThanOrEqual(q0 + 0.1);
      expect(u1).toBeLessThanOrEqual(p1 - 0.1);
      expect(v1).toBeLessThanOrEqual(q1 - 0.1);
    }
  });

  it('les vingt bâtiments et leurs toits tiennent dans la carte ; l’île, elle, déborde du cadre', () => {
    for (const id of MENU_ORDER) {
      const [x, y, w, h] = buildingFrame(id);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(x + w).toBeLessThan(MAP_W);
      expect(y + h).toBeLessThan(MAP_H);
      // La caméra vise le bâtiment lui-même.
      const [cx, cy] = buildingCenter(id);
      expect(cx).toBeGreaterThan(x);
      expect(cx).toBeLessThan(x + w);
      expect(cy).toBeGreaterThan(y);
      expect(cy).toBeLessThan(y + h);
    }
    // La place au milieu de la carte.
    const [px, py] = iso(PLAZA[0] + 1, PLAZA[1] + 1);
    expect(px).toBeCloseTo(MAP_W / 2, 6);
    expect(Math.abs(py - MAP_H / 2)).toBeLessThan(60);
    // Les quatre pointes de l'île (pelouse, ceinture d'arbres) sortent du cadre.
    expect(iso(-CITY_EDGE, -CITY_EDGE)[1]).toBeLessThan(0);
    expect(iso(GRID + CITY_EDGE, -CITY_EDGE)[0]).toBeGreaterThan(MAP_W);
    expect(iso(-CITY_EDGE, GRID + CITY_EDGE)[0]).toBeLessThan(0);
    expect(iso(GRID + CITY_EDGE, GRID + CITY_EDGE)[1]).toBeGreaterThan(MAP_H);
  });

  it('arbres, buissons, fleurs et bancs : jamais sur une chaussée, une allée, un bâtiment ni dans l’étang', () => {
    for (const t of [...TREES, ...BUSHES, ...FLOWERS, ...BENCHES]) {
      expect({
        t,
        offRoad:
          toBoulevard(t.u) > ROAD + 0.05 && toBoulevard(t.v) > ROAD + 0.05,
      }).toEqual({ t, offRoad: true });
      for (const q of DISTRICT_QUADS)
        if (inQuad([Math.floor(t.u), Math.floor(t.v)], q))
          expect({
            t,
            offLane:
              Math.abs(t.u - q[0] - 1) > LANE + 0.03 &&
              Math.abs(t.v - q[1] - 1) > LANE + 0.03,
          }).toEqual({ t, offLane: true });
      for (const id of MENU_ORDER)
        expect(inside(t.u, t.v, footprint(id), 0.02)).toBe(false);
      expect(
        ((t.u - POND.u) / POND.ru) ** 2 + ((t.v - POND.v) / POND.rv) ** 2
      ).toBeGreaterThan(1);
    }
    // La fontaine au milieu de la place.
    expect([FOUNTAIN.u, FOUNTAIN.v]).toEqual([PLAZA[0] + 1, PLAZA[1] + 1]);
  });

  it('passants sur les trottoirs et dans les allées, véhicules sur la chaussée, jamais à travers un bâtiment', () => {
    for (const r of [...WALKERS, ...CYCLISTS, ...CARS, TRUCK_ROUTE, DUCKS]) {
      expect(r.duration).toBeGreaterThan(4);
      for (const [u, v] of along(r.pts))
        for (const id of MENU_ORDER)
          expect(inside(u, v, footprint(id), 0.03)).toBe(false);
    }
    // Vélos, voitures et camions : tout droit sur la chaussée d'un boulevard.
    for (const r of [...CYCLISTS, ...CARS, TRUCK_ROUTE]) {
      expect(r.pts).toHaveLength(2);
      expect(toBoulevard(fixedOf(r.pts))).toBeLessThan(ROAD);
    }
    // Passants en ligne droite : sur un trottoir de boulevard ou dans une allée.
    for (const w of WALKERS.filter((r) => r.pts.length === 2)) {
      const c = fixedOf(w.pts);
      const sidewalk = toBoulevard(c) >= ROAD && toBoulevard(c) <= ROAD + 0.1;
      const lane = DISTRICT_QUADS.some(
        ([qu, qv]) => c === qu + 1 || c === qv + 1
      );
      expect({ walker: w.pts, onFoot: sidewalk || lane }).toEqual({
        walker: w.pts,
        onFoot: true,
      });
    }
    // Le camion part des ateliers (Production) et quitte l'île.
    const [qu] = quadOf('production');
    expect(TRUCK_ROUTE.pts[0][0]).toBeGreaterThanOrEqual(qu);
    expect(TRUCK_ROUTE.pts[0][0]).toBeLessThan(qu + 2);
    expect(TRUCK_ROUTE.pts[TRUCK_ROUTE.pts.length - 1][0]).toBeGreaterThan(
      GRID + CITY_EDGE
    );
  });

  it('aucun arbre ni banc sur le chemin d’un passant', () => {
    for (const w of WALKERS)
      for (const p of along(w.pts))
        for (const t of [...TREES, ...BENCHES])
          expect(Math.hypot(p[0] - t.u, p[1] - t.v)).toBeGreaterThan(0.1);
  });
});

describe('ville PEG — étiquettes', () => {
  const pairs = <T>(xs: T[]) =>
    xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as const));

  /** Aucun chevauchement, la pointe sous la pastille, toujours dans la carte. */
  const expectPlaced = (items: (LabelBox & { left: number })[]) => {
    const at = placeLabels(items);
    const boxes = items.map((l) => ({
      id: l.id,
      x0: l.x + at[l.id].dx - l.w / 2 - l.left,
      x1: l.x + at[l.id].dx + l.w / 2,
      y0: l.y + at[l.id].dy - l.h,
      y1: l.y + at[l.id].dy,
    }));
    for (const [a, b] of pairs(boxes))
      expect({
        pair: [a.id, b.id],
        overlap: a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0,
      }).toEqual({ pair: [a.id, b.id], overlap: false });
    for (const l of items) {
      // La pointe reste sous la pastille ; une étiquette trop haute descend
      // juste assez pour tenir dans la carte, puis monte d'une et demie au plus.
      const down = Math.max(0, 4 - (l.y - l.h));
      expect(Math.abs(at[l.id].dx)).toBeLessThanOrEqual(
        Math.max(0, l.w / 2 - 20) + 1e-9
      );
      expect(at[l.id].dy).toBeLessThanOrEqual(down + 1e-9);
      expect(at[l.id].dy).toBeGreaterThanOrEqual(down - 1.5 * l.h - 1e-9);
    }
    for (const b of boxes) expect(b.y0).toBeGreaterThanOrEqual(4 - 1e-6);
  };

  // De la carte la plus étroite (panneau à côté, écran de 1 000 px) au zoom.
  for (const k of [0.5, 0.55, 0.63, 0.7, 0.8, 1, 1.2]) {
    it(`noms : ne se chevauchent jamais, même tous allumés (échelle ${k})`, () => {
      const ls = Math.min(1, Math.max(0.82, k / 0.85));
      const slim = k < SLIM_BELOW;
      // Pire cas : pastille à deux chiffres, étoile et drapeau partout.
      expectPlaced(
        MENU_ORDER.map((id) => {
          const [x, y] = labelAnchor(id);
          const title = SECTION_INFO[id].title;
          return {
            id,
            x: x * k,
            y: y * k,
            w: slim
              ? slimLabelWidth(title, '12')
              : (labelWidth(title, '12') + 18) * ls,
            h: slim ? 27 : 41 * ls,
            left: slim ? 13 : 18 * ls,
          };
        })
      );
    });

    it(`pastilles-icônes : ne se chevauchent jamais non plus (échelle ${k})`, () => {
      // Comme sur la carte : 28 px, et 14 de plus pour le compteur (partout).
      expectPlaced(
        MENU_ORDER.map((id) => {
          const [x, y] = labelAnchor(id);
          return { id, x: x * k, y: y * k, w: 28 + 14, h: 28 + 5, left: 0 };
        })
      );
    });
  }

  it('posées au-dessus de leur bâtiment, dans la carte', () => {
    for (const id of MENU_ORDER) {
      const [x, y] = labelAnchor(id);
      const [u0, v0, u1, v1] = footprint(id);
      const { h, top } = BUILDINGS[id];
      const roof = iso((u0 + u1) / 2, (v0 + v1) / 2, h + top);
      expect(x).toBeCloseTo(roof[0], 6);
      expect(y).toBeLessThan(roof[1]);
      expect(y).toBeGreaterThan(roof[1] - 30);
      expect(x).toBeGreaterThan(60);
      expect(x).toBeLessThan(MAP_W - 60);
      expect(y).toBeGreaterThan(0);
    }
  });

  it('rien ne bouge quand tout tient ; sinon glisser avant de monter', () => {
    expect(
      placeLabels([
        { id: 'a', x: 100, y: 100, w: 100, h: 40 },
        { id: 'b', x: 400, y: 100, w: 100, h: 40 },
      ])
    ).toEqual({ a: { dx: 0, dy: 0 }, b: { dx: 0, dy: 0 } });
    const slide = placeLabels([
      { id: 'a', x: 100, y: 100, w: 100, h: 40 },
      { id: 'b', x: 190, y: 90, w: 100, h: 40 },
    ]);
    expect(slide.a.dy).toBe(0);
    expect(slide.b.dy).toBe(0);
    expect(Math.abs(slide.a.dx) + Math.abs(slide.b.dx)).toBeGreaterThan(0);
    // Juste au-dessus, impossible de glisser assez : elle monte.
    const rise = placeLabels([
      { id: 'a', x: 100, y: 120, w: 100, h: 40 },
      { id: 'b', x: 100, y: 100, w: 100, h: 40 },
    ]);
    expect(rise.a).toEqual({ dx: 0, dy: 0 });
    expect(rise.b.dy).toBeLessThan(0);
  });

  it('une étiquette trop haute pour la carte descend juste assez pour y tenir', () => {
    expect(placeLabels([{ id: 'a', x: 100, y: 20, w: 100, h: 40 }])).toEqual({
      a: { dx: 0, dy: 24 },
    });
  });
});

describe('ville PEG — rubriques reliées au menu admin', () => {
  const EXPECTED: Record<SectionId, string> = {
    accueil: 'Accueil',
    calendrier: 'Calendrier',
    projets: 'Projets',
    planning: 'Planning',
    devis: 'Devis',
    leads: 'Leads',
    clients: 'Clients',
    premium: 'Premium',
    generateurs: 'Générateurs',
    producteurs: 'Producteurs',
    boutique: 'Boutique',
    attributs: 'Attributs',
    fournisseurs: 'Fournisseurs',
    finance: 'Finance',
    bannieres: 'Bannières',
    campagnes: 'Campagnes',
    ia: 'IA',
    utilisateurs: 'Utilisateurs',
    tickets: 'Tickets',
    parametres: 'Paramètres',
  };

  it('chaque bâtiment porte le libellé exact du menu', () => {
    for (const id of MENU_ORDER)
      expect(SECTION_INFO[id].title).toBe(EXPECTED[id]);
  });

  it('chaque bâtiment mène à une vraie page', () => {
    for (const id of MENU_ORDER)
      expect(SECTION_INFO[id].to).toMatch(
        /^\/(admin|common|support|settings|home)/
      );
    expect(SECTION_INFO.boutique.to).toBe('/admin/store/orders');
    expect(SECTION_INFO.clients.sub).toBe('Liste des clients · Catégories');
  });
});
