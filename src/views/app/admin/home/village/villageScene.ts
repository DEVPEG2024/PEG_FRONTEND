// Village PEG — scène isométrique du tableau de bord admin (21/10/2026).
//
// Un bâtiment par rubrique du menu admin, regroupés en 5 quartiers d'un seul
// tenant. Les cases (u, v) sont celles de la grille isométrique : u descend
// vers la droite, v vers la gauche. Toute la géométrie est en pixels « carte »
// (MAP_W × MAP_H) ; le composant met la carte à l'échelle de son conteneur.
//
// Les sprites (public/img/village/*.svg) sont dessinés sur une toile 400 × 400
// dont l'ancre au sol (centre de la parcelle) est le point (200, 300).
// spriteManifest.json donne, pour chaque bâtiment et dans les coordonnées de
// cette toile, le haut du toit (labelY) et le cadre cliquable (hit).
//
// Ce module ne dépend ni de React ni du navigateur : il est testé tel quel.

import manifest from './spriteManifest.json';

/** À incrémenter quand les sprites changent (fichiers servis sans empreinte). */
const SPRITES_VERSION = 2;
export const spriteUrl = (name: string) =>
  `/img/village/${name}.svg?v=${SPRITES_VERSION}`;

export type SectionId =
  | 'accueil'
  | 'calendrier'
  | 'projets'
  | 'planning'
  | 'devis'
  | 'leads'
  | 'clients'
  | 'premium'
  | 'generateurs'
  | 'producteurs'
  | 'boutique'
  | 'attributs'
  | 'fournisseurs'
  | 'finance'
  | 'bannieres'
  | 'campagnes'
  | 'ia'
  | 'utilisateurs'
  | 'tickets'
  | 'parametres';

export type DistrictId =
  | 'pilotage'
  | 'clients'
  | 'catalogue'
  | 'finances'
  | 'admin';

export const MAP_W = 1132;
// Une rangée de plus en haut (21/10/2026) : le Calendrier a reculé d'une case
// pour laisser au chantier des projets la case juste derrière Projets.
export const MAP_H = 853;
const A = 140;
const B = A * Math.tan(Math.PI / 6);
const X0 = 566;
const Y0 = 296;
const INSET = 0.5714;
/** Échelle d'un sprite 400 × 400 sur la carte (≈ 0,533). */
export const SPRITE_SCALE = (INSET * A) / 150;
export const SPRITE_SIZE = 400 * SPRITE_SCALE;

/** Case (u, v) → point de la carte (centre de la case, au sol). */
export const toMap = (u: number, v: number): [number, number] => [
  X0 + (u - v) * A,
  Y0 + (u + v) * B,
];

/**
 * z-index d'un objet posé à la profondeur u + v (toujours sous les étiquettes).
 * Toujours positif : un z-index négatif passe SOUS le sol de l'îlot (calque sans
 * z-index) — la tour du Calendrier, rangée −1, disparaissait ainsi.
 */
export const depthZ = (depth: number) => Math.round((depth + 3) * 100) + 50;

export interface Cell {
  id: SectionId;
  u: number;
  v: number;
  district: DistrictId;
}

// Les très hauts (Calendrier, Leads) sont aux rangées arrière : leur étiquette
// ne retombe jamais sur un bâtiment situé derrière eux. La case (0, 0), juste
// derrière Projets, est le chantier des projets (CHANTIER, plus bas).
export const LAYOUT: Cell[] = [
  { id: 'calendrier', u: -1, v: 0, district: 'pilotage' },
  { id: 'accueil', u: 0, v: 1, district: 'pilotage' },
  { id: 'planning', u: 1, v: 0, district: 'pilotage' },
  { id: 'projets', u: 1, v: 1, district: 'pilotage' },
  { id: 'premium', u: -1, v: 1, district: 'clients' },
  { id: 'leads', u: -1, v: 2, district: 'clients' },
  { id: 'clients', u: 0, v: 2, district: 'clients' },
  { id: 'tickets', u: 0, v: 3, district: 'clients' },
  { id: 'producteurs', u: 1, v: 2, district: 'catalogue' },
  { id: 'boutique', u: 1, v: 3, district: 'catalogue' },
  { id: 'fournisseurs', u: 1, v: 4, district: 'catalogue' },
  { id: 'attributs', u: 2, v: 3, district: 'catalogue' },
  { id: 'finance', u: 2, v: 2, district: 'finances' },
  { id: 'devis', u: 3, v: 1, district: 'finances' },
  { id: 'generateurs', u: 3, v: 2, district: 'finances' },
  { id: 'utilisateurs', u: 1, v: -1, district: 'admin' },
  { id: 'ia', u: 2, v: -1, district: 'admin' },
  { id: 'parametres', u: 2, v: 0, district: 'admin' },
  { id: 'bannieres', u: 3, v: 0, district: 'admin' },
  { id: 'campagnes', u: 2, v: 1, district: 'admin' },
];

export interface District {
  id: DistrictId;
  /** Nom court, affiché sur la carte : « Quartier Pilotage ». */
  name: string;
  /** Nom du lieu, titre de la fiche : « Centre-ville ». */
  place: string;
  desc: string;
  hue: string;
  ink: string;
  soft: string;
  tile: string;
  plot: string;
  lit: string;
  shaded: string;
  /** Emplacement du nom sur la carte : un creux de l'îlot, hors des toits. */
  tag: [number, number];
}

export const DISTRICTS: District[] = [
  {
    id: 'pilotage',
    name: 'Pilotage',
    place: 'Centre-ville',
    desc: 'Le quotidien de PEG : le tableau de bord, les projets, la charge des producteurs et les rendez-vous.',
    hue: '#6d5dfc',
    ink: '#4f3fd1',
    soft: '#efecfe',
    tile: '#e7e1f6',
    plot: '#f7f4fd',
    lit: '#d6cdee',
    shaded: '#c6bbe3',
    tag: [720, 140],
  },
  {
    id: 'clients',
    name: 'Clients',
    place: 'Quartier des clients',
    desc: 'La relation client : leads à rappeler, fiches clients, abonnés Premium et demandes d’assistance.',
    hue: '#0ea5e9',
    ink: '#0369a1',
    soft: '#e6f4fb',
    tile: '#dbe9f3',
    plot: '#f3f8fc',
    lit: '#c9dbea',
    shaded: '#b6cbdf',
    tag: [64, 295],
  },
  {
    id: 'catalogue',
    name: 'Catalogue',
    place: 'Quartier des ateliers',
    desc: 'Ce que PEG fabrique et vend : producteurs, boutique, attributs produit et fournisseurs.',
    hue: '#f59e0b',
    ink: '#b45309',
    soft: '#fdf3e2',
    tile: '#f5e4cb',
    plot: '#fcf7ef',
    lit: '#e8d3b4',
    shaded: '#dbc19c',
    tag: [286, 700],
  },
  {
    id: 'finances',
    name: 'Finances',
    place: 'Quartier des finances',
    desc: 'L’argent : devis en attente de réponse, factures à encaisser et commissions des générateurs.',
    hue: '#16a34a',
    ink: '#15803d',
    soft: '#e8f6ec',
    tile: '#ddecd9',
    plot: '#f4f9f2',
    lit: '#cbdfc6',
    shaded: '#b7d0b1',
    tag: [1052, 641],
  },
  {
    id: 'admin',
    name: 'Administration',
    place: 'Quartier de la mairie',
    desc: 'L’administration et la communication : comptes, réglages, IA, campagnes et bannières.',
    hue: '#db2777',
    ink: '#be185d',
    soft: '#fcebf2',
    tile: '#f3dfe7',
    plot: '#fbf4f7',
    lit: '#e4cbd6',
    shaded: '#d5b6c4',
    tag: [1040, 231],
  },
];

export const districtById = (id: DistrictId): District =>
  DISTRICTS.find((d) => d.id === id) as District;

export const districtOf = (id: SectionId): DistrictId =>
  (LAYOUT.find((c) => c.id === id) as Cell).district;

/** Ordre de la barre latérale admin (navigation.config/admin.ts). */
export const MENU_ORDER: SectionId[] = [
  'accueil',
  'calendrier',
  'projets',
  'planning',
  'devis',
  'leads',
  'clients',
  'premium',
  'generateurs',
  'producteurs',
  'boutique',
  'attributs',
  'fournisseurs',
  'finance',
  'bannieres',
  'campagnes',
  'ia',
  'utilisateurs',
  'tickets',
  'parametres',
];

/** Bâtiments d'un quartier, dans l'ordre du menu. */
export const membersOf = (district: DistrictId): SectionId[] =>
  LAYOUT.filter((c) => c.district === district)
    .map((c) => c.id)
    .sort((a, b) => MENU_ORDER.indexOf(a) - MENU_ORDER.indexOf(b));

export interface SpriteMeta {
  labelY: number;
  hit: { x: number; y: number; w: number; h: number };
}
export const SPRITE_META = manifest as Record<SectionId, SpriteMeta>;

/** Point de la carte où se pose la pointe de l'étiquette (juste au-dessus du toit). */
export const labelAnchor = (cell: Cell): [number, number] => {
  const [cx, cy] = toMap(cell.u, cell.v);
  const top = cy - 300 * SPRITE_SCALE;
  return [cx, top + SPRITE_META[cell.id].labelY * SPRITE_SCALE - 10];
};

/** Centre d'un quartier (moyenne de ses cases), pour y centrer le zoom. */
export const districtCenter = (district: DistrictId): [number, number] => {
  const pts = LAYOUT.filter((c) => c.district === district).map((c) =>
    toMap(c.u, c.v)
  );
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
};

// ── Chantier des projets ─────────────────────────────────────────────────────

/** La case juste derrière le bâtiment Projets : le chantier (ce n'est pas une rubrique). */
export const CHANTIER = { u: 0, v: 0, district: 'pilotage' as DistrictId };

export type ChantierStage = 'fondations' | 'murs' | 'toit' | 'livre';

export const CHANTIER_SPRITE: Record<ChantierStage, string> = {
  fondations: 'chantier-fondations',
  murs: 'chantier-murs',
  toit: 'chantier-toit',
  livre: 'chantier-livre',
};

/**
 * Emplacements des maisons (cases), de gauche à droite, sur la ligne du milieu
 * de la parcelle : l'avant de la parcelle passe sous l'étiquette de Projets.
 */
export const CHANTIER_SLOTS: [number, number][] = [
  [-0.2, 0.2],
  [0, 0],
  [0.2, -0.2],
];

/** La grue, au fond de la parcelle ; sa flèche passe au-dessus des maisons. */
export const CHANTIER_CRANE = { sprite: 'chantier-grue', u: -0.3, v: -0.3 };

/** Haut de la grue dans sa toile (manifeste de chantier-grue.json). */
const CRANE_TOP = 153;

/** Pointe de l'étiquette « Chantiers », au-dessus de la grue. */
export const chantierLabelAnchor = (): [number, number] => {
  const [cx, cy] = toMap(CHANTIER_CRANE.u, CHANTIER_CRANE.v);
  return [cx, cy - 300 * SPRITE_SCALE + CRANE_TOP * SPRITE_SCALE - 10];
};

/** Cadre cliquable commun aux quatre maisons (toile 400 × 400, d'après leurs manifestes). */
export const CHANTIER_HIT = { x: 140, y: 246, w: 130, h: 90 };

// ── Vie du village : détails liés aux données du jour ───────────────────────

/** Point d'une toile de sprite (400 × 400, ancre 200, 300) posée sur la case (u, v). */
export const spritePoint = (
  u: number,
  v: number,
  x: number,
  y: number
): [number, number] => {
  const [cx, cy] = toMap(u, v);
  return [cx + (x - 200) * SPRITE_SCALE, cy + (y - 300) * SPRITE_SCALE];
};

/** Sommet de la cheminée de l'atelier (sprite Producteurs) : fumée quand la production tourne. */
export const CHIMNEY = { id: 'producteurs' as SectionId, x: 187.9, y: 169 };

/** Jet de la fontaine de la place (sprite Accueil). */
export const FOUNTAIN_JET = { id: 'accueil' as SectionId, x: 200, y: 266 };

/** Places devant la Boutique, le long de la rue : une voiture par commande du jour (3 au plus). */
export const PARKING: Decor[] = [
  { sprite: 'car-y-red', u: 1.35, v: 2.88 },
  { sprite: 'car-y-blue', u: 1.35, v: 3.06 },
  { sprite: 'car-y-amber', u: 1.35, v: 3.24 },
];

/**
 * Livraisons du jour : des camionnettes partent de Projets vers le bas de
 * l'îlot (elles remplacent alors la camionnette de passage de cette rue).
 */
export const DELIVERY_ROUTE: { from: [number, number]; to: [number, number] } =
  {
    from: [1.55, 1.25],
    to: [1.55, 3.45],
  };

/** Coins avant de la parcelle d'une case (gauche, avant, droite), en pixels carte. */
export const plotFront = (
  u: number,
  v: number
): [[number, number], [number, number], [number, number]] => {
  const [cx, cy] = toMap(u, v);
  return [
    [cx - A * INSET, cy],
    [cx, cy + B * INSET],
    [cx + A * INSET, cy],
  ];
};

// ── Caméra ───────────────────────────────────────────────────────────────────

/** Paliers des boutons + et − ; la molette zoome en continu entre 1 et ZOOM_MAX. */
export const ZOOM_STEPS = [1, 1.4, 1.85, 2.4];
export const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

/** Décalage de la carte borné : le bord de la carte n'apparaît jamais. */
export const clampOffset = (
  width: number,
  height: number,
  k: number,
  tx: number,
  ty: number
): [number, number] => [
  Math.min(0, Math.max(width - MAP_W * k, tx)),
  Math.min(0, Math.max(height - MAP_H * k, ty)),
];

/** Décalage qui centre le point (fx, fy) de la carte (un peu bas : on voit les toits). */
export const cameraOffset = (
  width: number,
  height: number,
  k: number,
  fx: number,
  fy: number
) =>
  clampOffset(width, height, k, width / 2 - fx * k, height / 2 - (fy - 50) * k);

/** Point de la carte au centre de la vue pour un décalage donné (inverse de cameraOffset). */
export const focusOf = (
  width: number,
  height: number,
  k: number,
  tx: number,
  ty: number
): [number, number] => [(width / 2 - tx) / k, (height / 2 - ty) / k + 50];

/** Palier de zoom suivant (+1) ou précédent (−1). */
export const stepZoom = (zoom: number, dir: 1 | -1) =>
  dir > 0
    ? (ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? ZOOM_MAX)
    : ([...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.01) ?? 1);

// ── Sol ──────────────────────────────────────────────────────────────────────

export interface GroundLayer {
  district: District;
  tiles: string;
  lit: string;
  shaded: string;
  plotTop: string;
  plotLeft: string;
  plotRight: string;
}

export interface Ground {
  layers: GroundLayer[];
  /** Allées en pas japonais : arêtes partagées entre deux cases. */
  stones: string;
  /** Parcelle du chantier (terre battue) : dessus et tranches. */
  lot: { top: string; left: string; right: string };
}

const pt = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const poly = (pts: [number, number][]) => `M${pts.map(pt).join(' L')} Z`;
const down = (p: [number, number], k: number): [number, number] => [
  p[0],
  p[1] + k,
];

/** Losange de la parcelle d'une case (là où se pose l'anneau de sélection). */
export const plotPath = (u: number, v: number): string => {
  const [cx, cy] = toMap(u, v);
  return poly([
    [cx, cy - B * INSET],
    [cx + A * INSET, cy],
    [cx, cy + B * INSET],
    [cx - A * INSET, cy],
  ]);
};

/**
 * L'îlot = union des cases, teinté par quartier, avec ses tranches visibles
 * (faces avant), les parcelles surélevées et les allées sur les arêtes
 * partagées (elles font aussi la frontière entre deux quartiers).
 */
export const buildGround = (): Ground => {
  const cells = [...LAYOUT, CHANTIER];
  const occupied = new Set(cells.map((c) => `${c.u},${c.v}`));
  const has = (u: number, v: number) => occupied.has(`${u},${v}`);
  const TH = 14;
  const PTH = 6;
  const byDistrict = new Map<DistrictId, GroundLayer>();
  let stones = '';
  const lot = { top: '', left: '', right: '' };
  for (const c of cells) {
    let layer = byDistrict.get(c.district);
    if (!layer) {
      layer = {
        district: districtById(c.district),
        tiles: '',
        lit: '',
        shaded: '',
        plotTop: '',
        plotLeft: '',
        plotRight: '',
      };
      byDistrict.set(c.district, layer);
    }
    const { u, v } = c;
    const T = toMap(u - 0.5, v - 0.5);
    const R = toMap(u + 0.5, v - 0.5);
    const Bo = toMap(u + 0.5, v + 0.5);
    const L = toMap(u - 0.5, v + 0.5);
    layer.tiles += poly([T, R, Bo, L]);
    if (!has(u, v + 1)) layer.lit += poly([L, Bo, down(Bo, TH), down(L, TH)]);
    if (!has(u + 1, v))
      layer.shaded += poly([Bo, R, down(R, TH), down(Bo, TH)]);
    if (has(u + 1, v)) stones += `M${pt(R)} L${pt(Bo)} `;
    if (has(u, v + 1)) stones += `M${pt(L)} L${pt(Bo)} `;
    const [cx, cy] = toMap(u, v);
    const t: [number, number] = [cx, cy - B * INSET];
    const r: [number, number] = [cx + A * INSET, cy];
    const b: [number, number] = [cx, cy + B * INSET];
    const l: [number, number] = [cx - A * INSET, cy];
    const plot = c === CHANTIER ? lot : null;
    if (plot) {
      plot.top += poly([t, r, b, l]);
      plot.left += poly([l, b, down(b, PTH), down(l, PTH)]);
      plot.right += poly([b, r, down(r, PTH), down(b, PTH)]);
      continue;
    }
    layer.plotTop += poly([t, r, b, l]);
    layer.plotLeft += poly([l, b, down(b, PTH), down(l, PTH)]);
    layer.plotRight += poly([b, r, down(r, PTH), down(b, PTH)]);
  }
  return {
    layers: DISTRICTS.map((d) => byDistrict.get(d.id) as GroundLayer),
    stones,
    lot,
  };
};

// ── Décors et promeneurs ─────────────────────────────────────────────────────

export interface Decor {
  sprite: string;
  u: number;
  v: number;
}

// Placés hors des trajets des promeneurs : arbres sur les bords arrière de
// l'îlot, massifs et buissons sur les bords avant (jamais devant une façade),
// lampadaires au coin droit des carrefours, scènes de rue devant les façades.
export const DECOR: Decor[] = (
  [
    ['bench-x', 0, 1.32],
    ['waver', 1, 1.33],
    ['group-chat', 0.67, 1.33],
    ['waver', 0.32, 2],
    ['bench-y', 1.32, 2],
    ['delivery', 1.34, 4],
    ['pots', 0.9, 3.32],
    ['group-chat', 1.33, 2.67],
    ['waver', 2.67, 1.33],
    ['pots', 1.32, -1],
    ['decor-tree-round', -1.39, -0.2],
    ['decor-tree-round', -1.39, 0.26],
    ['decor-tree-cone', -1.2, -0.39],
    ['decor-tree-cone', 0.26, -0.39],
    ['decor-tree-cone', -1.39, 0.8],
    ['decor-tree-cone', -1.39, 1.26],
    ['decor-tree-cone', -1.2, 0.61],
    ['decor-tree-round', -0.74, 0.61],
    ['decor-tree-cone', -1.39, 1.8],
    ['decor-tree-cone', -1.39, 2.26],
    ['flowers-x', -1.22, 2.4],
    ['decor-tree-round', -0.39, 2.8],
    ['decor-tree-cone', -0.39, 3.26],
    ['decor-bush', -0.22, 3.4],
    ['decor-tree-cone', 0.61, 3.8],
    ['decor-tree-cone', 0.61, 4.26],
    ['flowers-x', 0.78, 4.4],
    ['flowers-y', 2.4, 2.78],
    ['decor-bush', 1.78, 3.4],
    ['decor-bush', 3.4, 0.78],
    ['flowers-y', 3.4, 1.78],
    ['flowers-x', 2.78, 2.4],
    ['decor-tree-round', 0.61, -1.2],
    ['decor-tree-cone', 0.61, -0.74],
    ['decor-tree-round', 0.8, -1.39],
    ['decor-tree-round', 1.26, -1.39],
    ['decor-tree-round', 1.8, -1.39],
    ['decor-tree-cone', 2.26, -1.39],
    ['flowers-y', 2.4, -1.22],
    ['decor-tree-cone', 2.8, -0.39],
    ['decor-tree-cone', 3.26, -0.39],
    ['decor-bush', 3.4, -0.22],
    ['decor-lamp', 0.67, 0.33],
    ['decor-tree-round', 0.33, 0.67],
    ['decor-lamp', 0.67, 1.33],
    ['decor-lamp', -0.33, 1.33],
    ['decor-lamp', 1.67, -0.67],
    ['decor-tree-round', 1.33, -0.33],
    ['decor-lamp', 1.67, 1.33],
    ['decor-lamp', 0.67, 2.33],
    ['decor-tree-round', 0.33, 2.67],
    ['decor-lamp', 1.67, 2.33],
    ['decor-bush', 2.33, 0.67],
  ] as [string, number, number][]
).map(([sprite, u, v]) => ({ sprite, u, v }));

export interface Walker {
  /** Sprite de l'aller (tourné dans le sens de la marche). */
  sprite: string;
  /** Sprite du retour : présent = aller-retour ; absent = aller simple en fondu. */
  back?: string;
  from: [number, number];
  to: [number, number];
  /** Durée d'un cycle complet, en secondes. */
  duration: number;
  /** Décalage de départ (négatif = déjà en route au chargement). */
  delay: number;
  /** Véhicule : pas de balancement de la marche. */
  vehicle?: boolean;
}

// Piétons à −0,05 de l'axe des rues, camionnettes à +0,05.
export const WALKERS: Walker[] = [
  {
    sprite: 'walk-pair-go',
    back: 'walk-pair-back',
    from: [-1.3, 1.45],
    to: [3.3, 1.45],
    duration: 46,
    delay: 0,
  },
  {
    sprite: 'walk-amber-go',
    back: 'walk-amber-back',
    from: [1.45, -1.3],
    to: [1.45, 4.2],
    duration: 50,
    delay: -20,
  },
  {
    sprite: 'walk-red-go',
    back: 'walk-red-back',
    from: [-0.35, 0.45],
    to: [3.35, 0.45],
    duration: 34,
    delay: -8,
  },
  {
    sprite: 'walk-teal-go',
    back: 'walk-teal-back',
    from: [0.45, -0.35],
    to: [0.45, 3.35],
    duration: 36,
    delay: -27,
  },
  {
    sprite: 'walk-violet-go',
    back: 'walk-violet-back',
    from: [2.45, -0.35],
    to: [2.45, 2.35],
    duration: 28,
    delay: -5,
  },
  {
    sprite: 'walk-green-go',
    back: 'walk-green-back',
    from: [-0.35, 2.45],
    to: [2.35, 2.45],
    duration: 28,
    delay: -16,
  },
  {
    sprite: 'walk-family-go',
    back: 'walk-family-back',
    from: [0.6, -0.45],
    to: [2.4, -0.45],
    duration: 30,
    delay: -3,
  },
  {
    sprite: 'walk-courier',
    from: [-1.3, 1.58],
    to: [3.3, 1.58],
    duration: 30,
    delay: -12,
  },
  {
    sprite: 'walk-navy',
    from: [-0.45, 0.6],
    to: [-0.45, 2.4],
    duration: 14,
    delay: -4,
  },
  {
    sprite: 'decor-van',
    from: [-0.45, 0.55],
    to: [3.45, 0.55],
    duration: 18,
    delay: -5,
    vehicle: true,
  },
  {
    sprite: 'van-y',
    from: [1.55, -1.4],
    to: [1.55, 3.45],
    duration: 20,
    delay: -11,
    vehicle: true,
  },
];

// ── Étiquettes ───────────────────────────────────────────────────────────────

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface LabelInput {
  id: string;
  /** Pointe de l'étiquette (bas-milieu), en pixels écran. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Profondeur u + v : les étiquettes de devant gardent leur place. */
  depth: number;
}

export interface PlacedLabel {
  id: string;
  /** Centre horizontal de la pastille et bas de la pastille. */
  x: number;
  y: number;
  /** Décalage latéral de la pastille (sa pointe reste au-dessus du toit). */
  dx: number;
  /** Hauteur du trait de rappel quand la pastille a dû remonter (0 sinon). */
  lift: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * Pose les étiquettes sans chevauchement. Celles de devant restent en place ;
 * celle de derrière qui gêne glisse d'abord de côté (sa pointe reste
 * au-dessus du toit), sinon remonte avec un trait de rappel. `fixed` = zones
 * déjà prises (noms des quartiers), que les étiquettes contournent.
 */
export const placeLabels = (
  items: LabelInput[],
  fixed: Box[] = []
): PlacedLabel[] => {
  const placed: Box[] = [...fixed];
  const boxAt = (it: LabelInput, x: number, bottom: number): Box => ({
    x0: x - it.w / 2 - 6,
    x1: x + it.w / 2 + 6,
    y0: bottom - it.h - 4,
    y1: bottom + 4,
  });
  const blocker = (b: Box) => placed.find((p) => overlaps(b, p));
  return [...items]
    .sort((a, b) => b.depth - a.depth || b.y - a.y)
    .map((it) => {
      let dx = 0;
      let bottom = it.y;
      let box: Box | null = null;
      for (const d of [0, -16, 16, -32, 32, -48, 48]) {
        if (Math.abs(d) > it.w / 2 - 20) continue;
        const b = boxAt(it, it.x + d, it.y);
        if (!blocker(b)) {
          dx = d;
          box = b;
          break;
        }
      }
      for (let k = 0; !box && k < 40; k++) {
        const b = boxAt(it, it.x, bottom);
        const hit = blocker(b);
        if (!hit) box = b;
        else bottom = hit.y0 - 8;
      }
      if (!box) box = boxAt(it, it.x, bottom);
      placed.push(box);
      return {
        id: it.id,
        x: it.x + dx,
        y: bottom,
        dx,
        lift: Math.max(0, it.y - bottom),
      };
    });
};

/**
 * Place de l'aperçu d'un bâtiment (survol) : au-dessus de son étiquette s'il
 * y tient, sinon à côté, du côté le plus dégagé — jamais sur le bâtiment
 * survolé, jamais hors de la carte (elle coupe ce qui dépasse).
 */
export const previewPlacement = (o: {
  /** Centre horizontal et bas de l'étiquette, en pixels écran. */
  x: number;
  y: number;
  pillW: number;
  pillH: number;
  cardW: number;
  cardH: number;
  mapW: number;
  mapH: number;
  /** Une bulle d'activité occupe déjà le dessus de l'étiquette. */
  busyAbove?: boolean;
}): { left: number; top: number; side: 'above' | 'right' | 'left' } => {
  const m = 8;
  const within = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), Math.max(lo, hi));
  const pillTop = o.y - o.pillH;
  const aboveTop = pillTop - 8 - o.cardH;
  if (!o.busyAbove && aboveTop >= m)
    return {
      left: within(o.x - o.cardW / 2, m, o.mapW - m - o.cardW),
      top: aboveTop,
      side: 'above',
    };
  const top = within(pillTop - 6, m, o.mapH - m - o.cardH);
  const rightX = o.x + o.pillW / 2 + 12;
  const roomRight = o.mapW - m - rightX;
  const roomLeft = o.x - o.pillW / 2 - 12 - m;
  if (roomRight >= o.cardW || roomRight >= roomLeft)
    return {
      left: Math.max(m, Math.min(rightX, o.mapW - m - o.cardW)),
      top,
      side: 'right',
    };
  return {
    left: Math.max(m, o.x - o.pillW / 2 - 12 - o.cardW),
    top,
    side: 'left',
  };
};

/** Largeur d'une pastille d'étiquette (texte 13,5 px gras, icône, pastille de compte). */
export const labelWidth = (title: string, badge?: string | null) =>
  11 +
  18 +
  7 +
  title.length * 7.8 +
  (badge ? 13 + Math.max(22, 12 + badge.length * 7) : 14);

/** Cadre occupé par le nom d'un quartier centré en (x, y), en pixels écran. */
export const districtTagBox = (d: District, x: number, y: number): Box => {
  const w = 41 + Math.max(61, d.name.length * 7.6);
  return { x0: x - w / 2 - 6, x1: x + w / 2 + 6, y0: y - 21, y1: y + 21 };
};
