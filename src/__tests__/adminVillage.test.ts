// Village PEG (tableau de bord admin) : invariants de la scène.
// Une case par rubrique du menu, quartiers d'un seul tenant, décors hors des
// trajets et sur l'îlot, étiquettes qui ne se chevauchent jamais.
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  CHANTIER,
  CHANTIER_CRANE,
  CHANTIER_SLOTS,
  CHANTIER_SPRITE,
  DECOR,
  DELIVERY_ROUTE,
  DISTRICTS,
  LAYOUT,
  MAP_H,
  MAP_W,
  MENU_ORDER,
  PARKING,
  SPRITE_META,
  WALKERS,
  chantierLabelAnchor,
  districtTagBox,
  labelAnchor,
  labelWidth,
  membersOf,
  placeLabels,
  type LabelInput,
} from '@/views/app/admin/home/village/villageScene';

const SPRITES = resolve(__dirname, '../../public/img/village');
const onIsland = (u: number, v: number) =>
  [...LAYOUT, CHANTIER].some(
    (c) => Math.abs(u - c.u) <= 0.5 && Math.abs(v - c.v) <= 0.5
  );

describe('village PEG — disposition', () => {
  it('un bâtiment, et un seul, par rubrique du menu admin', () => {
    const ids = LAYOUT.map((c) => c.id);
    expect(new Set(ids).size).toBe(20);
    expect([...ids].sort()).toEqual([...MENU_ORDER].sort());
  });

  it('deux bâtiments ne partagent jamais une case (chantier compris)', () => {
    const cells = [...LAYOUT, CHANTIER].map((c) => `${c.u},${c.v}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('le chantier est juste derrière le bâtiment Projets', () => {
    const projets = LAYOUT.find((c) => c.id === 'projets')!;
    expect([projets.u - CHANTIER.u, projets.v - CHANTIER.v]).toEqual([1, 1]);
    for (const [du, dv] of [
      ...CHANTIER_SLOTS,
      [CHANTIER_CRANE.u, CHANTIER_CRANE.v],
    ])
      expect(Math.max(Math.abs(du), Math.abs(dv))).toBeLessThanOrEqual(0.3);
    for (const name of [
      ...Object.values(CHANTIER_SPRITE),
      CHANTIER_CRANE.sprite,
    ])
      expect(existsSync(resolve(SPRITES, `${name}.svg`))).toBe(true);
  });

  it('chaque quartier est d’un seul tenant (le chantier fait partie du Pilotage)', () => {
    for (const d of DISTRICTS) {
      const cells = [...LAYOUT, CHANTIER].filter((c) => c.district === d.id);
      expect(cells.length).toBeGreaterThan(0);
      const seen = new Set([`${cells[0].u},${cells[0].v}`]);
      const todo = [cells[0]];
      while (todo.length) {
        const c = todo.pop()!;
        for (const [du, dv] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const n = cells.find((x) => x.u === c.u + du && x.v === c.v + dv);
          if (n && !seen.has(`${n.u},${n.v}`)) {
            seen.add(`${n.u},${n.v}`);
            todo.push(n);
          }
        }
      }
      expect(seen.size).toBe(cells.length);
    }
  });

  it('les quartiers couvrent tout le menu, dans l’ordre du menu', () => {
    const all = DISTRICTS.flatMap((d) => membersOf(d.id));
    expect(all.length).toBe(20);
    expect(membersOf('pilotage')).toEqual([
      'accueil',
      'calendrier',
      'projets',
      'planning',
    ]);
  });

  it('les bâtiments très hauts sont aux rangées arrière (leur étiquette ne cache personne)', () => {
    for (const c of LAYOUT) {
      if (SPRITE_META[c.id].labelY < 120)
        expect(c.u + c.v).toBeLessThanOrEqual(1);
    }
  });

  it('chaque bâtiment a un manifeste et un sprite', () => {
    for (const c of LAYOUT) {
      const m = SPRITE_META[c.id];
      expect(m.labelY).toBeGreaterThan(10);
      expect(m.labelY).toBeLessThan(300);
      expect(m.hit.w).toBeGreaterThan(20);
      expect(existsSync(resolve(SPRITES, `${c.id}.svg`))).toBe(true);
    }
  });
});

describe('village PEG — décors et promeneurs', () => {
  const dist = (
    p: [number, number],
    a: [number, number],
    b: [number, number]
  ) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
      )
    );
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  it('tous les sprites utilisés existent', () => {
    const names = [
      ...DECOR.map((d) => d.sprite),
      ...PARKING.map((d) => d.sprite),
      ...WALKERS.flatMap((w) => [w.sprite, w.back].filter(Boolean) as string[]),
    ];
    for (const n of names)
      expect(existsSync(resolve(SPRITES, `${n}.svg`))).toBe(true);
  });

  it('décors et trajets restent sur l’îlot', () => {
    for (const d of [...DECOR, ...PARKING])
      expect(onIsland(d.u, d.v)).toBe(true);
    for (const w of [...WALKERS, DELIVERY_ROUTE]) {
      for (let t = 0; t <= 1; t += 0.05) {
        const u = w.from[0] + (w.to[0] - w.from[0]) * t;
        const v = w.from[1] + (w.to[1] - w.from[1]) * t;
        expect(onIsland(u, v)).toBe(true);
      }
    }
  });

  it('aucun décor immobile sur le trajet d’un promeneur', () => {
    for (const d of [...DECOR, ...PARKING]) {
      for (const w of [...WALKERS, DELIVERY_ROUTE]) {
        expect(dist([d.u, d.v], w.from, w.to)).toBeGreaterThanOrEqual(0.079);
      }
    }
  });

  it('les voitures garées ne touchent aucun décor', () => {
    for (const p of PARKING)
      for (const d of DECOR)
        expect(Math.hypot(p.u - d.u, p.v - d.v)).toBeGreaterThanOrEqual(0.15);
  });
});

describe('village PEG — étiquettes', () => {
  const boxOf = (l: { x: number; y: number }, w: number, h: number) => ({
    x0: l.x - w / 2,
    x1: l.x + w / 2,
    y0: l.y - h,
    y1: l.y,
  });
  const overlap = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) =>
    a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

  for (const scale of [1, 0.85, 0.7]) {
    it(`ne se chevauchent pas et évitent les noms de quartier (échelle ${scale})`, () => {
      const tags = DISTRICTS.map((d) =>
        districtTagBox(d, d.tag[0] * scale, d.tag[1] * scale)
      );
      const items: LabelInput[] = LAYOUT.map((c) => {
        const [x, y] = labelAnchor(c);
        return {
          id: c.id,
          x: x * scale,
          y: y * scale,
          w: labelWidth(c.id, '12'),
          h: 32,
          depth: c.u + c.v,
        };
      });
      const [cx, cy] = chantierLabelAnchor();
      items.push({
        id: 'chantier',
        x: cx * scale,
        y: cy * scale,
        w: labelWidth('Chantiers', '3'),
        h: 32,
        depth: CHANTIER.u + CHANTIER.v,
      });
      const placed = placeLabels(items, tags);
      expect(placed).toHaveLength(21);
      // Rien ne sort par le haut de la carte.
      for (const p of placed) expect(p.y - 32).toBeGreaterThanOrEqual(0);
      expect(MAP_W).toBe(1132);
      expect(MAP_H).toBeGreaterThan(800);
      const boxes = placed.map((p) =>
        boxOf(p, items.find((i) => i.id === p.id)!.w, 32)
      );
      for (let i = 0; i < boxes.length; i++) {
        for (const t of tags) expect(overlap(boxes[i], t)).toBe(false);
        for (let j = i + 1; j < boxes.length; j++)
          expect(overlap(boxes[i], boxes[j])).toBe(false);
      }
      // La pointe reste au-dessus du toit : glissement latéral borné.
      for (const p of placed) {
        const w = items.find((i) => i.id === p.id)!.w;
        expect(Math.abs(p.dx)).toBeLessThanOrEqual(w / 2 - 20);
      }
    });
  }
});

describe('village PEG — rubriques reliées au menu admin', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    SECTION_INFO,
  } = require('@/views/app/admin/home/village/villageSections');
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
