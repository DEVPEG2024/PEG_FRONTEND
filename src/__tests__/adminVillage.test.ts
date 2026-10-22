// Ville PEG (tableau de bord admin) : invariants de la scène.
// Six quartiers qui couvrent tout le menu, chaque bâtiment sur sa parcelle,
// arbres et passants hors des bâtiments, étiquettes qui ne se chevauchent pas.
import {
  BENCHES,
  BUILDINGS,
  CITY_EDGE,
  DISTRICTS,
  DISTRICT_BLOCK,
  GRID,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  PARKS,
  PLOT_INSET,
  PRIMARY,
  ROAD,
  TREES,
  TRUCK_ROUTE,
  WALKERS,
  blockCenter,
  buildingFrame,
  districtCenter,
  districtOf,
  footprint,
  iso,
  labelAnchor,
  labelWidth,
  membersOf,
  placeLabels,
} from '@/views/app/admin/home/village/villageScene';
import { SECTION_INFO } from '@/views/app/admin/home/village/villageSections';

const IDS = DISTRICTS.map((d) => d.id);
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

describe('ville PEG — six quartiers', () => {
  it('Projets, Clients, Boutique, Production, Finance, Assistance', () => {
    expect(DISTRICTS.map((d) => d.name)).toEqual([
      'Projets',
      'Clients',
      'Boutique',
      'Production',
      'Finance',
      'Assistance',
    ]);
    for (const d of DISTRICTS)
      for (const c of [d.hue, d.ink, d.soft])
        expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(DISTRICTS.map((d) => d.hue)).size).toBe(6);
  });

  it('chaque rubrique du menu appartient à un quartier, et à un seul', () => {
    const all = IDS.flatMap((d) => membersOf(d));
    expect(all).toHaveLength(MENU_ORDER.length);
    expect([...all].sort()).toEqual([...MENU_ORDER].sort());
    for (const id of MENU_ORDER)
      expect(membersOf(districtOf(id))).toContain(id);
  });

  it('rubriques dans l’ordre du menu ; la pastille vient d’une rubrique du quartier', () => {
    expect(membersOf('projets')).toEqual(['accueil', 'calendrier', 'projets']);
    expect(membersOf('clients')).toEqual([
      'leads',
      'clients',
      'premium',
      'campagnes',
    ]);
    expect(membersOf('boutique')).toEqual([
      'boutique',
      'attributs',
      'bannieres',
    ]);
    expect(membersOf('production')).toEqual([
      'planning',
      'producteurs',
      'fournisseurs',
    ]);
    expect(membersOf('finance')).toEqual(['devis', 'generateurs', 'finance']);
    expect(membersOf('assistance')).toEqual([
      'ia',
      'utilisateurs',
      'tickets',
      'parametres',
    ]);
    for (const d of IDS) expect(membersOf(d)).toContain(PRIMARY[d]);
  });
});

describe('ville PEG — plan', () => {
  it('trois îlots sur trois : Projets sur la place centrale, trois parcs', () => {
    expect(DISTRICT_BLOCK.projets).toEqual([1, 1]);
    const blocks = [...Object.values(DISTRICT_BLOCK), ...PARKS];
    expect(new Set(blocks.map((b) => b.join(','))).size).toBe(GRID * GRID);
    for (const b of blocks)
      for (const n of b) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(GRID);
      }
    expect(blockCenter('projets')).toEqual([1.5, 1.5]);
  });

  it('chaque bâtiment tient sur sa parcelle (rues et trottoirs libres)', () => {
    for (const id of IDS) {
      const [i, j] = DISTRICT_BLOCK[id];
      const [u0, v0, u1, v1] = footprint(id);
      expect(u0).toBeGreaterThanOrEqual(i + PLOT_INSET + 0.02);
      expect(v0).toBeGreaterThanOrEqual(j + PLOT_INSET + 0.02);
      expect(u1).toBeLessThanOrEqual(i + 1 - PLOT_INSET - 0.02);
      expect(v1).toBeLessThanOrEqual(j + 1 - PLOT_INSET - 0.02);
    }
    // La tour de Projets domine la ville.
    for (const id of IDS)
      if (id !== 'projets')
        expect(BUILDINGS.projets.h).toBeGreaterThan(BUILDINGS[id].h);
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
      expect(y + 14).toBeLessThan(MAP_H - 20);
    }
    for (const id of IDS) {
      const [x, y, w, h] = buildingFrame(id);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
      expect(x + w).toBeLessThan(MAP_W);
      expect(y + h).toBeLessThan(MAP_H);
      // La caméra vise le bâtiment lui-même.
      const [cx, cy] = districtCenter(id);
      expect(cx).toBeGreaterThan(x);
      expect(cx).toBeLessThan(x + w);
      expect(cy).toBeGreaterThan(y);
      expect(cy).toBeLessThan(y + h);
    }
  });

  it('arbres et bancs : ni sur une rue, ni dans un bâtiment', () => {
    for (const t of [...TREES, ...BENCHES]) {
      expect(toRoad(t.u)).toBeGreaterThan(ROAD + 0.04);
      expect(toRoad(t.v)).toBeGreaterThan(ROAD + 0.04);
      for (const id of IDS)
        expect(inside(t.u, t.v, footprint(id), 0.04)).toBe(false);
    }
  });

  it('passants sur les trottoirs, camions sur la rue, jamais à travers un bâtiment', () => {
    for (const r of [...WALKERS, TRUCK_ROUTE]) {
      expect(r.duration).toBeGreaterThan(4);
      // Le long d'une rue, jamais en diagonale à travers une parcelle.
      for (let k = 1; k < r.pts.length; k++)
        expect(
          r.pts[k][0] === r.pts[k - 1][0] || r.pts[k][1] === r.pts[k - 1][1]
        ).toBe(true);
      for (const [u, v] of along(r.pts)) {
        for (const id of IDS)
          expect(inside(u, v, footprint(id), 0.03)).toBe(false);
        expect(u).toBeGreaterThan(-CITY_EDGE);
        expect(u).toBeLessThan(GRID + CITY_EDGE);
        expect(v).toBeGreaterThan(-CITY_EDGE);
        expect(v).toBeLessThan(GRID + CITY_EDGE);
      }
    }
    // Trottoir : entre la chaussée et la parcelle.
    const sidewalk = (x: number) =>
      toRoad(x) >= ROAD - 1e-9 && toRoad(x) <= PLOT_INSET + 1e-9;
    for (const w of WALKERS) {
      const [a, b] = w.pts;
      expect(a[0] === b[0] ? sidewalk(a[0]) : sidewalk(a[1])).toBe(true);
    }
    // Chaussée : à moins d'une demi-largeur de la ligne de la rue.
    expect(toRoad(TRUCK_ROUTE.pts[0][1])).toBeLessThan(ROAD);
  });

  it('aucun arbre ni banc sur le chemin d’un passant', () => {
    for (const w of WALKERS)
      for (const p of along(w.pts))
        for (const t of [...TREES, ...BENCHES])
          expect(Math.hypot(p[0] - t.u, p[1] - t.v)).toBeGreaterThan(0.075);
  });
});

describe('ville PEG — étiquettes', () => {
  const pairs = <T>(xs: T[]) =>
    xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as const));

  // Carte la plus étroite (panneau à côté, écran de 1 000 px) jusqu'à la plus large.
  for (const fit of [0.55, 0.63, 0.8, 1]) {
    it(`ne se chevauchent pas et restent liées à leur toit (carte à ${fit})`, () => {
      const ls = Math.min(1, Math.max(0.82, fit / 0.85));
      // Pire cas : pastille à deux chiffres, étoile et drapeau d'alerte partout.
      const items = DISTRICTS.map((d) => {
        const [x, y] = labelAnchor(d.id);
        return {
          id: d.id,
          x: x * fit,
          y: y * fit,
          w: (labelWidth(d.name, '38') + 18) * ls,
          h: 41 * ls,
          left: 18 * ls,
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
      expect(at.projets).toEqual({ dx: 0, dy: 0 });
      for (const l of items) {
        // La pointe reste sous la pastille ; la tige ne dépasse pas une étiquette.
        expect(Math.abs(at[l.id].dx)).toBeLessThanOrEqual(l.w / 2 - 20);
        expect(at[l.id].dy).toBeLessThanOrEqual(0);
        expect(at[l.id].dy).toBeGreaterThanOrEqual(-l.h);
      }
      for (const b of boxes) expect(b.y0).toBeGreaterThanOrEqual(4);
    });
  }

  it('posées au-dessus de leur bâtiment, dans la carte', () => {
    for (const id of IDS) {
      const [x, y] = labelAnchor(id);
      const [u0, v0, u1, v1] = footprint(id);
      const roof = iso((u0 + u1) / 2, (v0 + v1) / 2, BUILDINGS[id].h);
      expect(x).toBeCloseTo(roof[0], 6);
      expect(y).toBeLessThan(roof[1] - 20);
      expect(y).toBeGreaterThan(iso(u0, v0, BUILDINGS[id].h)[1] - 40);
      expect(x).toBeGreaterThan(120);
      expect(x).toBeLessThan(MAP_W - 120);
      expect(y - 41).toBeGreaterThan(0);
    }
  });

  it('rien ne bouge quand tout tient ; sinon glisser avant de monter', () => {
    expect(
      placeLabels([
        { id: 'projets', x: 100, y: 100, w: 100, h: 40 },
        { id: 'clients', x: 400, y: 100, w: 100, h: 40 },
      ])
    ).toEqual({ projets: { dx: 0, dy: 0 }, clients: { dx: 0, dy: 0 } });
    const slide = placeLabels([
      { id: 'projets', x: 100, y: 100, w: 100, h: 40 },
      { id: 'production', x: 190, y: 90, w: 100, h: 40 },
    ]);
    expect(slide.projets).toEqual({ dx: 0, dy: 0 });
    expect(slide.production.dx).toBeGreaterThan(0);
    expect(slide.production.dy).toBe(0);
    // Juste au-dessus, impossible de glisser assez : elle monte.
    const rise = placeLabels([
      { id: 'projets', x: 100, y: 100, w: 100, h: 40 },
      { id: 'clients', x: 100, y: 80, w: 100, h: 40 },
    ]);
    expect(rise.clients.dy).toBeLessThan(0);
    expect(rise.clients.dy).toBeGreaterThanOrEqual(-40);
  });
});

describe('ville PEG — rubriques reliées au menu admin', () => {
  const EXPECTED: Record<string, string> = {
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

  it('chaque rubrique porte le libellé exact du menu', () => {
    for (const id of MENU_ORDER)
      expect(SECTION_INFO[id].title).toBe(EXPECTED[id]);
  });

  it('chaque rubrique mène à une vraie page', () => {
    for (const id of MENU_ORDER)
      expect(SECTION_INFO[id].to).toMatch(
        /^\/(admin|common|support|settings|home)/
      );
    expect(SECTION_INFO.boutique.to).toBe('/admin/store/orders');
    expect(SECTION_INFO.clients.sub).toBe('Liste des clients · Catégories');
  });
});
