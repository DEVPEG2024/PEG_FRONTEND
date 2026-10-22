// Ville PEG — scène isométrique de l'accueil admin (refonte du 22/10/2026,
// d'après la maquette « petite ville isométrique moderne »).
//
// Six quartiers sur une grille de 3 × 3 îlots : Projets au centre, sur la
// place ; Clients, Production, Boutique, Assistance et Finance autour ; trois
// petits parcs dans les coins. Les vingt rubriques du menu admin sont
// rattachées à ces quartiers (aucune ne disparaît). Les rues passent entre
// les îlots. Tout est dessiné par le code (SVG), sans image.
//
// Coordonnées : (u, v) au sol, en îlots — l'îlot (i, j) couvre [i, i+1] ×
// [j, j+1] ; u descend vers la droite, v vers la gauche ; z = hauteur en
// pixels. La carte fait MAP_W × MAP_H pixels « carte » ; le composant la met
// à l'échelle de son conteneur.
//
// Ce module ne dépend ni de React ni du navigateur : il est testé tel quel.

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
  | 'projets'
  | 'clients'
  | 'boutique'
  | 'production'
  | 'finance'
  | 'assistance';

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

export interface District {
  id: DistrictId;
  /** Nom du quartier, sur la carte : « Production ». */
  name: string;
  /** Nom du lieu, titre de la fiche : « Les ateliers ». */
  place: string;
  desc: string;
  /** Couleur du quartier (icône, pastilles), encre lisible, fond doux. */
  hue: string;
  ink: string;
  soft: string;
}

export const DISTRICTS: District[] = [
  {
    id: 'projets',
    name: 'Projets',
    place: 'La place centrale',
    desc: 'Le cœur de PEG : les projets en cours, les rendez-vous et livraisons du calendrier, le pense-bête.',
    hue: '#6d5dfc',
    ink: '#4f3fd1',
    soft: '#efecfe',
  },
  {
    id: 'clients',
    name: 'Clients',
    place: 'Le quartier des clients',
    desc: 'La relation client : leads à rappeler, fiches clients, abonnés Premium et campagnes.',
    hue: '#3b82f6',
    ink: '#1d4ed8',
    soft: '#e8f0fe',
  },
  {
    id: 'boutique',
    name: 'Boutique',
    place: 'La rue commerçante',
    desc: 'Ce que PEG vend : commandes et produits, attributs (tailles, couleurs, formulaires) et bannières.',
    hue: '#ec4899',
    ink: '#be185d',
    soft: '#fdeaf3',
  },
  {
    id: 'production',
    name: 'Production',
    place: 'Les ateliers',
    desc: 'Ce que PEG fabrique : les producteurs, la charge de l’atelier (planning) et les fournisseurs.',
    hue: '#f97316',
    ink: '#c2410c',
    soft: '#fff1e6',
  },
  {
    id: 'finance',
    name: 'Finance',
    place: 'Le quartier des finances',
    desc: 'L’argent : factures à encaisser, devis en attente de réponse et commissions des générateurs.',
    hue: '#14b8a6',
    ink: '#0f766e',
    soft: '#e6f7f4',
  },
  {
    id: 'assistance',
    name: 'Assistance',
    place: 'Le centre d’assistance',
    desc: 'Le support et l’administration : tickets, IA, comptes utilisateurs et réglages.',
    hue: '#6366f1',
    ink: '#4338ca',
    soft: '#eef0fe',
  },
];

/** Les rubriques de chaque quartier (ordre du menu). */
const MEMBERS: Record<DistrictId, SectionId[]> = {
  projets: ['accueil', 'calendrier', 'projets'],
  clients: ['leads', 'clients', 'premium', 'campagnes'],
  boutique: ['boutique', 'attributs', 'bannieres'],
  production: ['planning', 'producteurs', 'fournisseurs'],
  finance: ['devis', 'generateurs', 'finance'],
  assistance: ['ia', 'utilisateurs', 'tickets', 'parametres'],
};

/** La rubrique qui donne sa pastille au quartier, sur la carte. */
export const PRIMARY: Record<DistrictId, SectionId> = {
  projets: 'projets',
  clients: 'clients',
  boutique: 'boutique',
  production: 'producteurs',
  finance: 'finance',
  assistance: 'tickets',
};

export const districtById = (id: DistrictId): District =>
  DISTRICTS.find((d) => d.id === id) as District;

export const districtOf = (id: SectionId): DistrictId =>
  (Object.keys(MEMBERS) as DistrictId[]).find((d) =>
    MEMBERS[d].includes(id)
  ) as DistrictId;

/** Rubriques d'un quartier, dans l'ordre du menu. */
export const membersOf = (district: DistrictId): SectionId[] =>
  [...MEMBERS[district]].sort(
    (a, b) => MENU_ORDER.indexOf(a) - MENU_ORDER.indexOf(b)
  );

// ── Projection ────────────────────────────────────────────────────────────────

export const MAP_W = 1200;
export const MAP_H = 760;
/** Demi-largeur d'un îlot à l'écran ; projection isométrique à 30°. */
const A = 160;
const B = A * Math.tan(Math.PI / 6);
const X0 = 600;
const Y0 = 100;

/** Point du sol (u, v), à la hauteur z (pixels) → point de la carte. */
export const iso = (u: number, v: number, z = 0): [number, number] => [
  X0 + (u - v) * A,
  Y0 + (u + v) * B - z,
];

const f1 = (n: number) => n.toFixed(1);
/** Chemin SVG fermé passant par des points de la carte. */
export const pathOf = (pts: [number, number][]) =>
  `M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L')} Z`;

/**
 * Rectangle aux coins arrondis posé au sol, à la hauteur z : le contour d'un
 * îlot, d'une parcelle. Arcs approchés par `steps` segments.
 */
export const groundRect = (
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  r: number,
  z = 0,
  steps = 6
): string => {
  const pts: [number, number][] = [];
  const arc = (cu: number, cv: number, start: number) => {
    for (let s = 0; s <= steps; s++) {
      const a = start + (s / steps) * (Math.PI / 2);
      pts.push(iso(cu + r * Math.cos(a), cv + r * Math.sin(a), z));
    }
  };
  arc(u1 - r, v1 - r, 0);
  arc(u0 + r, v1 - r, Math.PI / 2);
  arc(u0 + r, v0 + r, Math.PI);
  arc(u1 - r, v0 + r, Math.PI * 1.5);
  return pathOf(pts);
};

// ── La ville ─────────────────────────────────────────────────────────────────

/** Trois îlots par trois ; les rues suivent les lignes entières 0 à 3. */
export const GRID = 3;
/** Demi-largeur d'une rue ; bord du trottoir extérieur. */
export const ROAD = 0.12;
export const CITY_EDGE = 0.22;
/** Marge d'une parcelle dans son îlot (rue + trottoir). */
export const PLOT_INSET = 0.16;

/** Îlot de chaque quartier (i, j). */
export const DISTRICT_BLOCK: Record<DistrictId, [number, number]> = {
  production: [1, 0],
  clients: [0, 1],
  projets: [1, 1],
  assistance: [2, 1],
  boutique: [1, 2],
  finance: [2, 2],
};

/** Les îlots sans quartier sont des parcs. */
export const PARKS: [number, number][] = [
  [0, 0],
  [2, 0],
  [0, 2],
];

/** Centre (u, v) de l'îlot d'un quartier. */
export const blockCenter = (id: DistrictId): [number, number] => {
  const [i, j] = DISTRICT_BLOCK[id];
  return [i + 0.5, j + 0.5];
};

export interface BuildingSpec {
  id: DistrictId;
  /** Emprise au sol (le long de u, de v) et hauteur (px). */
  w: number;
  d: number;
  h: number;
  /** Décalage vers le fond de la parcelle (place libre devant). */
  back: number;
}

export const BUILDINGS: Record<DistrictId, BuildingSpec> = {
  projets: { id: 'projets', w: 0.42, d: 0.42, h: 168, back: 0.02 },
  clients: { id: 'clients', w: 0.4, d: 0.36, h: 118, back: 0.05 },
  production: { id: 'production', w: 0.46, d: 0.38, h: 96, back: 0.05 },
  boutique: { id: 'boutique', w: 0.42, d: 0.34, h: 92, back: 0.05 },
  finance: { id: 'finance', w: 0.4, d: 0.38, h: 104, back: 0.05 },
  assistance: { id: 'assistance', w: 0.38, d: 0.36, h: 110, back: 0.05 },
};

/** Emprise d'un bâtiment : [u0, v0, u1, v1]. */
export const footprint = (id: DistrictId): [number, number, number, number] => {
  const [cu, cv] = blockCenter(id);
  const b = BUILDINGS[id];
  const u = cu - b.back;
  const v = cv - b.back;
  return [u - b.w / 2, v - b.d / 2, u + b.w / 2, v + b.d / 2];
};

/** Silhouette d'un bâtiment (pour le survol et le clic). */
export const silhouette = (id: DistrictId): string => {
  const [u0, v0, u1, v1] = footprint(id);
  const h = BUILDINGS[id].h;
  return pathOf([
    iso(u0, v1, 0),
    iso(u1, v1, 0),
    iso(u1, v0, 0),
    iso(u1, v0, h),
    iso(u0, v0, h),
    iso(u0, v1, h),
  ]);
};

/** Cadre d'un bâtiment sur la carte [x, y, largeur, hauteur] : vignettes de la fiche. */
export const buildingFrame = (
  id: DistrictId
): [number, number, number, number] => {
  const [u0, v0, u1, v1] = footprint(id);
  const h = BUILDINGS[id].h;
  const pts = [
    iso(u0, v1, 0),
    iso(u1, v1, 0),
    iso(u1, v0, 0),
    iso(u0, v0, h + 50),
    iso(u1, v0, h + 14),
    iso(u0, v1, h + 14),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const m = 14;
  const x = Math.min(...xs) - m;
  const y = Math.min(...ys) - m;
  return [x, y, Math.max(...xs) + m - x, Math.max(...ys) + m - y];
};

/** Point de la carte où se pose la pointe de l'étiquette (au-dessus du toit). */
export const labelAnchor = (id: DistrictId): [number, number] => {
  const [u0, v0, u1, v1] = footprint(id);
  return iso((u0 + u1) / 2, (v0 + v1) / 2, BUILDINGS[id].h + 30);
};

/** Point visé par la caméra pour un quartier (le milieu du bâtiment). */
export const districtCenter = (id: DistrictId): [number, number] => {
  const [cu, cv] = blockCenter(id);
  return iso(cu, cv, BUILDINGS[id].h * 0.35);
};

/** Profondeur d'un objet posé en (u, v) : du fond vers l'avant. */
export const depthOf = (u: number, v: number) => u + v;

export interface Tree {
  u: number;
  v: number;
  /** Taille relative (1 = arbre moyen). */
  s: number;
}

/** Arbres : aux coins des parcelles, et nombreux dans les parcs. */
export const TREES: Tree[] = [
  // Parc du nord (0, 0)
  { u: 0.3, v: 0.32, s: 1.1 },
  { u: 0.55, v: 0.26, s: 0.9 },
  { u: 0.28, v: 0.62, s: 0.95 },
  { u: 0.72, v: 0.5, s: 1.15 },
  { u: 0.55, v: 0.74, s: 0.85 },
  // Parc de l'est (2, 0)
  { u: 2.3, v: 0.3, s: 1 },
  { u: 2.7, v: 0.32, s: 0.9 },
  { u: 2.5, v: 0.62, s: 1.15 },
  { u: 2.75, v: 0.72, s: 0.85 },
  // Parc de l'ouest (0, 2)
  { u: 0.3, v: 2.3, s: 0.95 },
  { u: 0.32, v: 2.7, s: 1.1 },
  { u: 0.62, v: 2.5, s: 0.9 },
  { u: 0.74, v: 2.76, s: 1 },
  // Autour des bâtiments (coins avant des parcelles, à l'écart des passants)
  { u: 0.24, v: 1.78, s: 0.85 },
  { u: 0.78, v: 1.77, s: 0.8 },
  { u: 1.8, v: 0.22, s: 0.85 },
  { u: 1.78, v: 0.77, s: 0.8 },
  { u: 1.23, v: 1.77, s: 0.8 },
  { u: 1.77, v: 1.23, s: 0.8 },
  { u: 2.24, v: 1.77, s: 0.8 },
  { u: 2.8, v: 1.78, s: 0.85 },
  { u: 1.24, v: 2.8, s: 0.85 },
  { u: 1.77, v: 2.78, s: 0.8 },
  { u: 2.24, v: 2.8, s: 0.85 },
  { u: 2.8, v: 2.24, s: 0.8 },
];

/** Bancs (le long d'une parcelle) : orientés le long de u ou de v. */
export const BENCHES: { u: number; v: number; along: 'u' | 'v' }[] = [
  { u: 0.62, v: 0.5, along: 'v' },
  { u: 2.5, v: 0.76, along: 'u' },
  { u: 0.5, v: 2.62, along: 'u' },
  { u: 1.5, v: 2.8, along: 'u' },
  { u: 2.78, v: 2.5, along: 'v' },
];

/** Marquages au sol : tirets blancs au milieu des rues, entre les carrefours. */
export const laneDashes = (): string => {
  const parts: string[] = [];
  const seg = (a: [number, number], b: [number, number]) =>
    parts.push(`M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])}`);
  for (let k = 0; k <= GRID; k++)
    for (let j = 0; j < GRID; j++) {
      seg(iso(k, j + ROAD + 0.04), iso(k, j + 1 - ROAD - 0.04));
      seg(iso(j + ROAD + 0.04, k), iso(j + 1 - ROAD - 0.04, k));
    }
  return parts.join(' ');
};

/**
 * Passages piétons autour de la place centrale (îlot Projets) : bandes
 * blanches en travers de la rue, au milieu de chaque côté de la place.
 */
export const crosswalks = (): string => {
  const [i, j] = DISTRICT_BLOCK.projets;
  const stripes: string[] = [];
  const band = (u0: number, v0: number, u1: number, v1: number) =>
    stripes.push(pathOf([iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)]));
  for (const k of [i, i + 1]) // rues le long de v, de part et d'autre
    for (let s = -2; s <= 2; s++) {
      const u = k + s * 0.045;
      band(u - 0.014, j + 0.42, u + 0.014, j + 0.58);
    }
  for (const k of [j, j + 1]) // rues le long de u
    for (let s = -2; s <= 2; s++) {
      const v = k + s * 0.045;
      band(i + 0.42, v - 0.014, i + 0.58, v + 0.014);
    }
  return stripes.join(' ');
};

/** Trajet d'un passant ou d'un camion : points (u, v) le long des rues. */
export interface Route {
  pts: [number, number][];
  /** Durée d'un passage (s). */
  duration: number;
}

const routeLength = (pts: [number, number][]) =>
  pts.slice(1).reduce((sum, p, i) => {
    const a = iso(...pts[i]);
    const b = iso(...p);
    return sum + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }, 0);

/** Chemin SVG d'un trajet au sol, en pixels carte. */
export const routePath = (pts: [number, number][], z = 0) =>
  pts
    .map(([u, v], i) => {
      const [x, y] = iso(u, v, z);
      return `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    })
    .join(' ');

/** Passants : sur les trottoirs, au bord des parcelles (un sens chacun). */
export const WALKERS: Route[] = [
  [
    [0.3, 1.85],
    [2.7, 1.85],
  ],
  [
    [1.86, 2.75],
    [1.86, 0.3],
  ],
  [
    [2.7, 0.86],
    [0.35, 0.86],
  ],
  [
    [1.14, 0.3],
    [1.14, 2.7],
  ],
].map((pts) => ({
  pts: pts as [number, number][],
  duration: Math.round(routeLength(pts as [number, number][]) / 16),
}));

/**
 * Camions de livraison : ils partent de la Production, longent la rue entre
 * l'îlot de l'Assistance et le parc, et quittent la ville par l'est.
 */
export const TRUCK_ROUTE: Route = (() => {
  const pts: [number, number][] = [
    [1.55, 1.05],
    [3.14, 1.05],
  ];
  return { pts, duration: Math.round(routeLength(pts) / 34) };
})();

// ── Échanges entre les bâtiments ─────────────────────────────────────────────

export interface Exchange {
  from: DistrictId;
  to: DistrictId;
  /**
   * Bombé de la courbe (px) : positif = vers le haut de l'écran (au-dessus
   * des rues), négatif = vers le bas (devant la place).
   */
  arc: number;
}

/** Courbe d'un échange (pixels carte) : départ, point de contrôle, arrivée. */
export const exchangeCurve = (e: Exchange) => {
  const a = iso(...blockCenter(e.from), 18);
  const b = iso(...blockCenter(e.to), 18);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  // Perpendiculaire tournée vers le haut (vers la gauche si le trajet est vertical).
  let nx = (b[1] - a[1]) / len;
  let ny = -(b[0] - a[0]) / len;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const c: [number, number] = [
    (a[0] + b[0]) / 2 + nx * e.arc,
    (a[1] + b[1]) / 2 + ny * e.arc,
  ];
  const d = `M${f1(a[0])} ${f1(a[1])} Q${f1(c[0])} ${f1(c[1])} ${f1(b[0])} ${f1(b[1])}`;
  // Longueur approchée (polyligne de la courbe).
  let length = 0;
  let prev = a;
  for (let s = 1; s <= 24; s++) {
    const t = s / 24;
    const p: [number, number] = [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
    ];
    length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return { d, length };
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

/** Décalage qui centre le point (fx, fy) de la carte. */
export const cameraOffset = (
  width: number,
  height: number,
  k: number,
  fx: number,
  fy: number
) => clampOffset(width, height, k, width / 2 - fx * k, height / 2 - fy * k);

/** Point de la carte au centre de la vue pour un décalage donné (inverse de cameraOffset). */
export const focusOf = (
  width: number,
  height: number,
  k: number,
  tx: number,
  ty: number
): [number, number] => [(width / 2 - tx) / k, (height / 2 - ty) / k];

/** Palier de zoom suivant (+1) ou précédent (−1). */
export const stepZoom = (zoom: number, dir: 1 | -1) =>
  dir > 0
    ? (ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? ZOOM_MAX)
    : ([...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.01) ?? 1);

// ── Aperçu au survol ─────────────────────────────────────────────────────────

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

/** Largeur d'une étiquette (texte 13,5 px, icône, pastille de compte). */
export const labelWidth = (title: string, badge?: string | null) =>
  11 +
  18 +
  7 +
  title.length * 7.8 +
  (badge ? 13 + Math.max(22, 12 + badge.length * 7) : 14);

/** Étiquette à placer, en pixels écran : pointe en (x, y), pastille au-dessus. */
export interface LabelBox {
  id: DistrictId;
  x: number;
  y: number;
  w: number;
  /** Hauteur, pointe comprise. */
  h: number;
  /** Place prise à gauche de la pastille (drapeau d'alerte). */
  left?: number;
}

/** Déplacement d'une étiquette : glissement latéral, montée (px écran). */
export interface LabelPlace {
  dx: number;
  dy: number;
}

/**
 * Place des étiquettes pour qu'aucune n'en chevauche une autre sur une carte
 * étroite. Celle de Projets, au centre, ne bouge pas ; les autres glissent de
 * côté (leur demi-largeur moins 20 px au plus : la pointe reste sous la
 * pastille) et, s'il le faut, montent d'une hauteur d'étiquette au plus (une
 * tige les relie alors au toit) — le plus petit déplacement l'emporte,
 * glisser coûtant moins que monter. Jamais au-dessus du haut de la carte
 * (`top`). Si rien ne suffit, le plus petit chevauchement l'emporte.
 */
export const placeLabels = (
  items: LabelBox[],
  gap = 6,
  top = 4
): Record<DistrictId, LabelPlace> => {
  const box = (l: LabelBox, dx: number, dy: number) => ({
    x0: l.x + dx - l.w / 2 - (l.left ?? 0),
    x1: l.x + dx + l.w / 2,
    y0: l.y + dy - l.h,
    y1: l.y + dy,
  });
  type Box = ReturnType<typeof box>;
  const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + gap) *
    Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + gap);
  const order = [...items].sort((a, b) =>
    a.id === 'projets' ? -1 : b.id === 'projets' ? 1 : a.y - b.y
  );
  const placed: Box[] = [];
  const out = {} as Record<DistrictId, LabelPlace>;
  for (const l of order) {
    const maxX = Math.max(0, l.w / 2 - 20);
    let best: LabelPlace = { dx: 0, dy: 0 };
    let bestCost = Infinity;
    // Plus on monte, plus ça coûte : on s'arrête dès que monter ne peut plus gagner.
    for (let dy = 0; dy >= -l.h && 1.5 * -dy < bestCost; dy -= 2) {
      for (let s = 0; ; s += 2) {
        const step = Math.min(s, maxX);
        for (const dx of step ? [-step, step] : [0]) {
          const b = box(l, dx, dy);
          const clash =
            placed.reduce((sum, p) => sum + overlap(b, p), 0) +
            Math.max(0, top - b.y0) * l.w;
          const cost = clash * 1e4 + Math.abs(dx) + 1.5 * Math.abs(dy);
          if (cost < bestCost) {
            bestCost = cost;
            best = { dx, dy };
          }
        }
        if (step >= maxX) break;
      }
    }
    out[l.id] = best;
    placed.push(box(l, best.dx, best.dy));
  }
  return out;
};
