// Ville PEG — scène isométrique de l'accueil admin (22/10/2026).
//
// Un bâtiment par onglet du menu admin (20), chacun sur son îlot, sur une
// grille de 5 × 5 : la place centrale au milieu, un parc à chaque coin, des
// rues entre tous les îlots. Les bâtiments sont regroupés en six quartiers
// d'îlots voisins, au sol teinté de leur couleur : Projets autour de la place,
// Clients, Production, Assistance, Finance et Boutique tout autour. Tout est
// dessiné par le code (SVG), sans image.
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
  /** Teinte du sol de ses îlots, à peine colorée. */
  ground: string;
}

export const DISTRICTS: District[] = [
  {
    id: 'projets',
    name: 'Projets',
    place: 'La place centrale',
    desc: 'Le cœur de PEG, autour de la place : les projets en cours, le calendrier des rendez-vous et livraisons, l’accueil et son pense-bête.',
    hue: '#6d5dfc',
    ink: '#4f3fd1',
    soft: '#efecfe',
    ground: '#f4f2ff',
  },
  {
    id: 'clients',
    name: 'Clients',
    place: 'Le quartier des clients',
    desc: 'La relation client : leads à rappeler, fiches clients, abonnés Premium et campagnes.',
    hue: '#3b82f6',
    ink: '#1d4ed8',
    soft: '#e8f0fe',
    ground: '#eef4ff',
  },
  {
    id: 'boutique',
    name: 'Boutique',
    place: 'La rue commerçante',
    desc: 'Ce que PEG vend : commandes et produits, attributs (tailles, couleurs, formulaires) et bannières.',
    hue: '#ec4899',
    ink: '#be185d',
    soft: '#fdeaf3',
    ground: '#fdf1f6',
  },
  {
    id: 'production',
    name: 'Production',
    place: 'Les ateliers',
    desc: 'Ce que PEG fabrique : les producteurs, la charge de l’atelier (planning) et les fournisseurs.',
    hue: '#f97316',
    ink: '#c2410c',
    soft: '#fff1e6',
    ground: '#fff3e8',
  },
  {
    id: 'finance',
    name: 'Finance',
    place: 'Le quartier des finances',
    desc: 'L’argent : factures à encaisser, devis en attente de réponse et commissions des générateurs.',
    hue: '#14b8a6',
    ink: '#0f766e',
    soft: '#e6f7f4',
    ground: '#ebf8f4',
  },
  {
    id: 'assistance',
    name: 'Assistance',
    place: 'Le centre d’assistance',
    desc: 'Le support et l’administration : tickets, IA, comptes utilisateurs et réglages.',
    hue: '#6366f1',
    ink: '#4338ca',
    soft: '#eef0fe',
    ground: '#f1f1fe',
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
export const MAP_H = 740;
/** Demi-largeur d'un îlot à l'écran ; projection isométrique à 30°. */
export const A = 104;
export const B = A * Math.tan(Math.PI / 6);
const X0 = 600;
const Y0 = 80;

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
 * Rectangle aux coins arrondis posé au sol, à la hauteur z : le contour de la
 * ville, d'un îlot. Arcs approchés par `steps` segments.
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

/** Cinq îlots sur cinq ; les rues suivent les lignes entières 0 à 5. */
export const GRID = 5;
/** Demi-largeur d'une rue ; bord du trottoir extérieur. */
export const ROAD = 0.1;
export const CITY_EDGE = 0.18;
/** Marge d'une parcelle dans son îlot (rue + trottoir). */
export const PLOT_INSET = 0.14;

/** Îlot (i, j) de chaque bâtiment. */
export const BLOCK: Record<SectionId, [number, number]> = {
  // Projets : les trois îlots derrière la place centrale
  projets: [1, 1],
  accueil: [1, 2],
  calendrier: [2, 1],
  // Clients : à gauche
  clients: [0, 2],
  leads: [0, 3],
  premium: [0, 4],
  campagnes: [1, 3],
  // Production : à droite, au fond
  producteurs: [2, 0],
  planning: [3, 0],
  fournisseurs: [4, 0],
  // Assistance : à droite, devant
  tickets: [3, 1],
  ia: [4, 1],
  utilisateurs: [3, 2],
  parametres: [4, 2],
  // Finance : devant la place
  finance: [3, 3],
  generateurs: [4, 3],
  devis: [3, 4],
  // Boutique : à gauche, devant
  boutique: [2, 3],
  attributs: [1, 4],
  bannieres: [2, 4],
};

/** La place centrale (quartier Projets), le grand parc du fond et celui de devant. */
export const PLAZA: [number, number] = [2, 2];
export const PARKS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [4, 4],
];

/** Centre (u, v) d'un îlot. */
export const blockCenter = (id: SectionId): [number, number] => {
  const [i, j] = BLOCK[id];
  return [i + 0.5, j + 0.5];
};

export interface BuildingSpec {
  /** Emprise au sol (le long de u, de v) et hauteur des murs (px). */
  w: number;
  d: number;
  h: number;
  /** Ce qui dépasse du toit (px : toit pointu, couronne, éolienne…). */
  top: number;
}

/**
 * Les vingt bâtiments : plus hauts au fond (en haut de l'écran), plus bas
 * devant — personne n'en cache un autre, les étiquettes s'étagent. La tour
 * de Projets domine la ville, le grand parc derrière elle.
 */
export const BUILDINGS: Record<SectionId, BuildingSpec> = {
  projets: { w: 0.5, d: 0.5, h: 140, top: 14 },
  accueil: { w: 0.52, d: 0.48, h: 64, top: 34 },
  calendrier: { w: 0.5, d: 0.46, h: 92, top: 12 },
  clients: { w: 0.54, d: 0.5, h: 112, top: 12 },
  leads: { w: 0.46, d: 0.46, h: 94, top: 26 },
  premium: { w: 0.48, d: 0.48, h: 84, top: 24 },
  campagnes: { w: 0.5, d: 0.46, h: 68, top: 30 },
  producteurs: { w: 0.56, d: 0.5, h: 84, top: 44 },
  planning: { w: 0.48, d: 0.48, h: 94, top: 12 },
  fournisseurs: { w: 0.58, d: 0.5, h: 62, top: 10 },
  tickets: { w: 0.52, d: 0.5, h: 94, top: 12 },
  ia: { w: 0.48, d: 0.48, h: 80, top: 26 },
  utilisateurs: { w: 0.46, d: 0.46, h: 84, top: 10 },
  parametres: { w: 0.48, d: 0.46, h: 56, top: 30 },
  finance: { w: 0.54, d: 0.5, h: 80, top: 10 },
  generateurs: { w: 0.46, d: 0.46, h: 54, top: 40 },
  devis: { w: 0.48, d: 0.46, h: 60, top: 28 },
  boutique: { w: 0.52, d: 0.48, h: 80, top: 12 },
  attributs: { w: 0.48, d: 0.46, h: 72, top: 10 },
  bannieres: { w: 0.48, d: 0.44, h: 62, top: 30 },
};

/** Recul des bâtiments vers le fond de leur îlot (place libre devant). */
const BACK = 0.03;

/** Emprise d'un bâtiment : [u0, v0, u1, v1]. */
export const footprint = (id: SectionId): [number, number, number, number] => {
  const [cu, cv] = blockCenter(id);
  const b = BUILDINGS[id];
  const u = cu - BACK;
  const v = cv - BACK;
  return [u - b.w / 2, v - b.d / 2, u + b.w / 2, v + b.d / 2];
};

/** Silhouette d'un bâtiment, toit compris (pour le survol et le clic). */
export const silhouette = (id: SectionId): string => {
  const [u0, v0, u1, v1] = footprint(id);
  const { h, top } = BUILDINGS[id];
  const t = h + top * 0.7;
  return pathOf([
    iso(u0, v1, 0),
    iso(u1, v1, 0),
    iso(u1, v0, 0),
    iso(u1, v0, t),
    iso(u0, v0, t),
    iso(u0, v1, t),
  ]);
};

/** Cadre d'un bâtiment sur la carte [x, y, largeur, hauteur] : vignettes. */
export const buildingFrame = (
  id: SectionId
): [number, number, number, number] => {
  const [u0, v0, u1, v1] = footprint(id);
  const { h, top } = BUILDINGS[id];
  const pts = [
    iso(u0, v1, 0),
    iso(u1, v1, 0),
    iso(u1, v0, 0),
    iso(u0, v0, h + top + 6),
    iso(u1, v0, h + top),
    iso(u0, v1, h + top),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const m = 10;
  const x = Math.min(...xs) - m;
  const y = Math.min(...ys) - m;
  return [x, y, Math.max(...xs) + m - x, Math.max(...ys) + m - y];
};

/** Point de la carte où se pose la pointe de l'étiquette (au-dessus du toit). */
export const labelAnchor = (id: SectionId): [number, number] => {
  const [u0, v0, u1, v1] = footprint(id);
  const { h, top } = BUILDINGS[id];
  return iso((u0 + u1) / 2, (v0 + v1) / 2, h + top + 14);
};

/** Point visé par la caméra pour un bâtiment (le milieu de sa façade). */
export const buildingCenter = (id: SectionId): [number, number] => {
  const [cu, cv] = blockCenter(id);
  return iso(cu, cv, BUILDINGS[id].h * 0.45);
};

/** Point visé par la caméra pour un quartier (le milieu de ses îlots). */
export const districtCenter = (id: DistrictId): [number, number] => {
  const m = membersOf(id);
  const u = m.reduce((s, x) => s + blockCenter(x)[0], 0) / m.length;
  const v = m.reduce((s, x) => s + blockCenter(x)[1], 0) / m.length;
  return iso(u, v, 40);
};

/** Profondeur d'un objet posé en (u, v) : du fond vers l'avant. */
export const depthOf = (u: number, v: number) => u + v;

export interface Tree {
  u: number;
  v: number;
  /** Taille relative (1 = arbre moyen). */
  s: number;
}

/** Arbres : dans les parcs et aux angles de la place. */
export const TREES: Tree[] = [
  // Grand parc du fond : (0, 0), (1, 0), (0, 1)
  { u: 0.32, v: 0.3, s: 0.8 },
  { u: 0.7, v: 0.36, s: 0.68 },
  { u: 0.36, v: 0.72, s: 0.72 },
  { u: 0.74, v: 0.74, s: 0.84 },
  { u: 1.3, v: 0.3, s: 0.74 },
  { u: 1.7, v: 0.34, s: 0.66 },
  { u: 1.36, v: 0.72, s: 0.8 },
  { u: 1.7, v: 0.72, s: 0.68 },
  { u: 0.3, v: 1.32, s: 0.7 },
  { u: 0.7, v: 1.3, s: 0.8 },
  { u: 0.34, v: 1.7, s: 0.66 },
  { u: 0.72, v: 1.7, s: 0.74 },
  // Parc de devant (4, 4)
  { u: 4.3, v: 4.3, s: 0.76 },
  { u: 4.72, v: 4.34, s: 0.66 },
  { u: 4.34, v: 4.72, s: 0.7 },
  { u: 4.7, v: 4.7, s: 0.8 },
  // Angles de la place
  { u: 2.24, v: 2.24, s: 0.56 },
  { u: 2.76, v: 2.24, s: 0.56 },
  { u: 2.24, v: 2.76, s: 0.56 },
  { u: 2.76, v: 2.76, s: 0.56 },
];

/** Bancs : orientés le long de u ou de v. */
export const BENCHES: { u: number; v: number; along: 'u' | 'v' }[] = [
  { u: 0.52, v: 0.54, along: 'u' },
  { u: 1.52, v: 0.52, along: 'v' },
  { u: 0.52, v: 1.5, along: 'u' },
  { u: 4.52, v: 4.5, along: 'u' },
  { u: 2.5, v: 2.2, along: 'u' },
  { u: 2.2, v: 2.5, along: 'v' },
];

/** La fontaine, au milieu de la place. */
export const FOUNTAIN = { u: 2.5, v: 2.5, r: 0.16 };

/** Marquages au sol : tirets blancs au milieu des rues, entre les carrefours. */
export const laneDashes = (): string => {
  const parts: string[] = [];
  const seg = (a: [number, number], b: [number, number]) =>
    parts.push(`M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])}`);
  for (let k = 0; k <= GRID; k++)
    for (let j = 0; j < GRID; j++) {
      seg(iso(k, j + ROAD + 0.06), iso(k, j + 1 - ROAD - 0.06));
      seg(iso(j + ROAD + 0.06, k), iso(j + 1 - ROAD - 0.06, k));
    }
  return parts.join(' ');
};

/**
 * Passages piétons autour de la place centrale : bandes blanches en travers
 * de la rue, au milieu de chaque côté de la place.
 */
export const crosswalks = (): string => {
  const [i, j] = PLAZA;
  const stripes: string[] = [];
  const band = (u0: number, v0: number, u1: number, v1: number) =>
    stripes.push(pathOf([iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)]));
  for (const k of [i, i + 1]) // rues le long de v, de part et d'autre
    for (let s = -2; s <= 2; s++) {
      const u = k + s * 0.038;
      band(u - 0.012, j + 0.4, u + 0.012, j + 0.6);
    }
  for (const k of [j, j + 1]) // rues le long de u
    for (let s = -2; s <= 2; s++) {
      const v = k + s * 0.038;
      band(i + 0.4, v - 0.012, i + 0.6, v + 0.012);
    }
  return stripes.join(' ');
};

/** Trajet d'un passant ou d'un camion : points (u, v) le long des rues. */
export interface Route {
  pts: [number, number][];
  /** Durée d'un passage (s). */
  duration: number;
}

/** Longueur d'un trajet au sol, en pixels carte. */
export const routeLength = (pts: [number, number][]) =>
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

/** Passants : sur les trottoirs des rues qui entourent la place (un sens chacun). */
export const WALKERS: Route[] = [
  [
    [0.25, 1.88],
    [4.75, 1.88],
  ],
  [
    [3.12, 4.75],
    [3.12, 0.25],
  ],
  [
    [4.75, 3.12],
    [0.25, 3.12],
  ],
  [
    [1.88, 0.25],
    [1.88, 4.75],
  ],
].map((pts) => ({
  pts: pts as [number, number][],
  duration: Math.round(routeLength(pts as [number, number][]) / 16),
}));

/**
 * Camions de livraison : ils partent des ateliers (Producteurs), longent la
 * rue devant le Planning et les Fournisseurs, et quittent la ville par l'est.
 */
export const TRUCK_ROUTE: Route = (() => {
  const pts: [number, number][] = [
    [2.45, 1.04],
    [5.3, 1.04],
  ];
  return { pts, duration: Math.round(routeLength(pts) / 30) };
})();

// ── Échanges entre les bâtiments ─────────────────────────────────────────────

/** Porte d'un bâtiment : sur la rue devant sa façade éclairée (côté +v). */
export const doorOf = (id: SectionId): [number, number] => {
  const [i, j] = BLOCK[id];
  return [i + 0.5, j + 1];
};

/**
 * Trajet par les rues d'une porte à l'autre : la rue de départ jusqu'au
 * carrefour le plus proche de l'arrivée, la rue transversale, puis la rue
 * d'arrivée.
 */
export const streetRoute = (
  from: SectionId,
  to: SectionId
): [number, number][] => {
  const [ua, va] = doorOf(from);
  const [ub, vb] = doorOf(to);
  if (va === vb)
    return [
      [ua, va],
      [ub, vb],
    ];
  const k = ub > ua ? Math.floor(ub) : Math.ceil(ub);
  return [
    [ua, va],
    [k, va],
    [k, vb],
    [ub, vb],
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

/** Largeur d'une étiquette fine (carte étroite : point du quartier, nom, pastille). */
export const slimLabelWidth = (title: string, badge?: string | null) =>
  8 +
  6 +
  5 +
  title.length * 6.8 +
  (badge ? 5 + Math.max(16, 10 + badge.length * 6.2) + 4 : 9);

/** En dessous de cette échelle à l'écran, les étiquettes passent en fines. */
export const SLIM_BELOW = 0.8;

/** Étiquette à placer, en pixels écran : pointe en (x, y), pastille au-dessus. */
export interface LabelBox {
  id: string;
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
 * Place des étiquettes pour qu'aucune n'en chevauche une autre : on pose
 * d'abord celles du devant (en bas), puis on remonte. Une étiquette qui en
 * touche une autre glisse de côté (de sa demi-largeur moins 20 px au plus :
 * la pointe reste sous la pastille) et, s'il le faut, monte d'une hauteur et
 * demie au plus (une tige la relie alors au toit) — le plus petit déplacement
 * l'emporte, glisser coûtant moins que monter. Jamais au-dessus du haut de la
 * carte (`top`). Si rien ne suffit, le plus petit chevauchement l'emporte.
 */
export const placeLabels = (
  items: LabelBox[],
  gap = 5,
  top = 4
): Record<string, LabelPlace> => {
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
  const order = [...items].sort((a, b) => b.y - a.y);
  const boxes = new Map<string, Box>();
  const out: Record<string, LabelPlace> = {};
  /** Meilleure place d'une étiquette face à toutes les autres déjà posées. */
  const settle = (l: LabelBox) => {
    const others = [...boxes].filter(([id]) => id !== l.id).map(([, b]) => b);
    const maxX = Math.max(0, l.w / 2 - 20);
    let best: LabelPlace = { dx: 0, dy: 0 };
    let bestCost = Infinity;
    // Plus on monte, plus ça coûte : on s'arrête dès que monter ne peut plus gagner.
    for (let dy = 0; dy >= -1.5 * l.h && 1.5 * -dy < bestCost; dy -= 2) {
      for (let s = 0; ; s += 2) {
        const step = Math.min(s, maxX);
        for (const dx of step ? [-step, step] : [0]) {
          const b = box(l, dx, dy);
          const clash =
            others.reduce((sum, p) => sum + overlap(b, p), 0) +
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
    boxes.set(l.id, box(l, best.dx, best.dy));
  };
  // Une première pose du devant vers le fond, puis quelques reprises : une
  // étiquette déjà posée peut encore s'écarter pour celles qui l'entourent.
  order.forEach(settle);
  for (let pass = 0; pass < 3; pass++) order.forEach(settle);
  return out;
};
