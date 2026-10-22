// Ville PEG (tableau de bord admin) : invariants de la scène.
// Un bâtiment par onglet du menu, chacun sur son îlot ; six quartiers d'îlots
// voisins ; la place au centre, des parcs ; arbres, passants et camions hors
// des bâtiments ; étiquettes qui ne se chevauchent jamais.
import {
  BENCHES,
  BLOCK,
  BUILDINGS,
  CITY_EDGE,
  DISTRICTS,
  FOUNTAIN,
  GRID,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  PARKS,
  PLAZA,
  PLOT_INSET,
  PRIMARY,
  ROAD,
  SLIM_BELOW,
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
  slimLabelWidth,
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
/** Distance à la rue la plus proche (les rues suivent les lignes entières). */
const toRoad = (x: number) => Math.abs(x - Math.round(x));
/** Points d'un trajet, tous les 2 % de chaque segment. */
const along = (pts: [number, number][]) =>
  pts.slice(1).flatMap((b, k) => {
    const a = pts[k];
    return Array.from({ length: 51 }, (_, i): [number, number] => [
      a[0] + ((b[0] - a[0]) * i) / 50,
      a[1] + ((b[1] - a[1]) * i) / 50,
    ]);
  });

describe('ville PEG — un bâtiment par onglet du menu', () => {
  it('vingt bâtiments, chacun sur son îlot ; la place et les parcs complètent la grille', () => {
    expect(Object.keys(BLOCK).sort()).toEqual([...MENU_ORDER].sort());
    const cells = [...MENU_ORDER.map((id) => BLOCK[id]), PLAZA, ...PARKS];
    expect(new Set(cells.map(key)).size).toBe(GRID * GRID);
    for (const [i, j] of cells) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(GRID);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(GRID);
    }
    // La place au centre de la ville.
    expect(PLAZA).toEqual([2, 2]);
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

  it('Projets autour de la place, sa tour domine la ville', () => {
    for (const id of membersOf('projets')) {
      const [i, j] = BLOCK[id];
      expect(Math.max(Math.abs(i - PLAZA[0]), Math.abs(j - PLAZA[1]))).toBe(1);
    }
    for (const id of MENU_ORDER)
      if (id !== 'projets')
        expect(BUILDINGS.projets.h).toBeGreaterThan(BUILDINGS[id].h);
  });
});

describe('ville PEG — plan', () => {
  it('chaque bâtiment tient sur son îlot (rues et trottoirs libres)', () => {
    for (const id of MENU_ORDER) {
      const [i, j] = BLOCK[id];
      const [u0, v0, u1, v1] = footprint(id);
      expect(u0).toBeGreaterThanOrEqual(i + PLOT_INSET + 0.04);
      expect(v0).toBeGreaterThanOrEqual(j + PLOT_INSET + 0.04);
      expect(u1).toBeLessThanOrEqual(i + 1 - PLOT_INSET - 0.04);
      expect(v1).toBeLessThanOrEqual(j + 1 - PLOT_INSET - 0.04);
    }
  });

  it('toute la ville, son trottoir et ses toits tiennent dans la carte', () => {
    for (const [u, v] of [
      [-CITY_EDGE, -CITY_EDGE],
      [GRID + CITY_EDGE, -CITY_EDGE],
      [-CITY_EDGE, GRID + CITY_EDGE],
      [GRID + CITY_EDGE, GRID + CITY_EDGE],
    ]) {
      const [x, y] = iso(u, v);
      expect(x).toBeGreaterThan(20);
      expect(x).toBeLessThan(MAP_W - 20);
      expect(y).toBeGreaterThan(20);
      expect(y + 14).toBeLessThan(MAP_H);
    }
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
  });

  it('arbres, bancs et fontaine : dans les parcs et sur la place, jamais sur une rue', () => {
    const green = new Set([...PARKS, PLAZA].map(key));
    for (const t of [...TREES, ...BENCHES, FOUNTAIN]) {
      expect(toRoad(t.u)).toBeGreaterThan(PLOT_INSET);
      expect(toRoad(t.v)).toBeGreaterThan(PLOT_INSET);
      expect(green.has(key([Math.floor(t.u), Math.floor(t.v)]))).toBe(true);
    }
    expect(key([Math.floor(FOUNTAIN.u), Math.floor(FOUNTAIN.v)])).toBe(
      key(PLAZA)
    );
  });

  it('passants sur les trottoirs, camions sur la rue, jamais à travers un bâtiment', () => {
    for (const r of [...WALKERS, TRUCK_ROUTE]) {
      expect(r.duration).toBeGreaterThan(4);
      for (let k = 1; k < r.pts.length; k++)
        expect(
          r.pts[k][0] === r.pts[k - 1][0] || r.pts[k][1] === r.pts[k - 1][1]
        ).toBe(true);
      for (const [u, v] of along(r.pts))
        for (const id of MENU_ORDER)
          expect(inside(u, v, footprint(id), 0.03)).toBe(false);
    }
    const sidewalk = (x: number) =>
      toRoad(x) >= ROAD - 1e-9 && toRoad(x) <= PLOT_INSET + 1e-9;
    for (const w of WALKERS) {
      const [a, b] = w.pts;
      expect(a[0] === b[0] ? sidewalk(a[0]) : sidewalk(a[1])).toBe(true);
    }
    expect(toRoad(TRUCK_ROUTE.pts[0][1])).toBeLessThan(ROAD);
    // Le camion part des ateliers (Producteurs) et sort de la ville.
    expect(Math.floor(TRUCK_ROUTE.pts[0][0])).toBe(BLOCK.producteurs[0]);
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

  // De la carte la plus étroite (panneau à côté, écran de 1 000 px) au zoom.
  for (const k of [0.5, 0.55, 0.63, 0.7, 0.8, 1, 1.2]) {
    it(`ne se chevauchent jamais, même toutes allumées (échelle ${k})`, () => {
      const ls = Math.min(1, Math.max(0.82, k / 0.85));
      const slim = k < SLIM_BELOW;
      // Pire cas : pastille à deux chiffres, étoile et drapeau partout.
      const items = MENU_ORDER.map((id) => {
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
      });
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
        // La pointe reste sous la pastille ; la tige ne dépasse pas une étiquette et demie.
        expect(Math.abs(at[l.id].dx)).toBeLessThanOrEqual(l.w / 2 - 20 + 1e-9);
        expect(at[l.id].dy).toBeLessThanOrEqual(0);
        expect(at[l.id].dy).toBeGreaterThanOrEqual(-1.5 * l.h);
      }
      for (const b of boxes) expect(b.y0).toBeGreaterThanOrEqual(4);
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
      expect(x).toBeGreaterThan(80);
      expect(x).toBeLessThan(MAP_W - 80);
      expect(y - 41).toBeGreaterThan(0);
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
