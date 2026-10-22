// Ville PEG — scène isométrique de l'accueil admin (22/10/2026).
//
// Une île de verdure : un bâtiment par onglet du menu admin (20), chacun sur
// sa parcelle, dans neuf carrés de 2 × 2 îlots écartés par des boulevards
// plantés. Six carrés sont les quartiers (Projets, Clients, Production,
// Assistance, Finance, Boutique), celui du milieu la place centrale, deux
// autres des parcs (le bois et son étang au fond, un parc devant). Allées
// piétonnes dans les quartiers, arbres, jardins, passants, vélos, voitures.
// Tout est dessiné par le code (SVG), sans image.
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
export const A = 86;
export const B = A * Math.tan(Math.PI / 6);
const X0 = 600;
const Y0 = 20;

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

/** Ovale posé au sol (rayons en unités de sol), en points de la carte. */
export const groundOval = (
  cu: number,
  cv: number,
  ru: number,
  rv: number,
  z = 0,
  n = 32
): [number, number][] =>
  Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return iso(cu + ru * Math.cos(a), cv + rv * Math.sin(a), z);
  });

// ── La ville ─────────────────────────────────────────────────────────────────

/**
 * Neuf carrés de 2 × 2 îlots (six quartiers, la place, deux parcs), écartés
 * les uns des autres par des boulevards plantés d'un îlot de large : routes
 * au milieu (lignes 2,5 et 5,5), pelouse et rangées d'arbres de part et
 * d'autre. Une ceinture verte autour. L'île déborde un peu de la carte sur
 * les côtés : seuls ses bords verts sont coupés, tous les bâtiments restent
 * visibles.
 */
export const GRID = 8;
/** Origine des carrés le long de u et de v ; milieu des boulevards. */
export const QUAD_AT = [0, 3, 6];
export const BOULEVARDS = [2.5, 5.5];
/** Demi-largeur d'un boulevard, d'une allée ; bord de l'île. */
export const ROAD = 0.13;
export const LANE = 0.035;
export const CITY_EDGE = 0.7;
/** Retrait d'une parcelle : au bord du carré (pelouse du boulevard), le long d'une allée. */
export const EDGE_INSET = 0.07;
export const LANE_INSET = 0.08;

/** Origine (coin) du carré qui contient l'îlot de coordonnée k. */
const quadStart = (k: number) =>
  QUAD_AT.find((o) => k >= o && k < o + 2) as number;

/** Parcelle de l'îlot (i, j) : [u0, v0, u1, v1]. */
export const plotOf = (
  i: number,
  j: number
): [number, number, number, number] => {
  const ou = quadStart(i);
  const ov = quadStart(j);
  return [
    i + (i === ou ? EDGE_INSET : LANE_INSET),
    j + (j === ov ? EDGE_INSET : LANE_INSET),
    i + 1 - (i + 1 === ou + 2 ? EDGE_INSET : LANE_INSET),
    j + 1 - (j + 1 === ov + 2 ? EDGE_INSET : LANE_INSET),
  ];
};

/** Ce qu'occupe un carré de 2 × 2 îlots. */
export type QuadKind = DistrictId | 'place' | 'parc';

/** Les neuf carrés (coin (qu, qv)) : six quartiers, la place au centre, deux parcs. */
export const QUADS: { q: [number, number]; kind: QuadKind }[] = [
  { q: [0, 0], kind: 'parc' },
  { q: [3, 0], kind: 'projets' },
  { q: [6, 0], kind: 'production' },
  { q: [0, 3], kind: 'clients' },
  { q: [3, 3], kind: 'place' },
  { q: [6, 3], kind: 'assistance' },
  { q: [0, 6], kind: 'boutique' },
  { q: [3, 6], kind: 'finance' },
  { q: [6, 6], kind: 'parc' },
];

/** Parcelle d'un carré entier (la place, un parc). */
export const quadPlot = ([qu, qv]: [number, number]): [
  number,
  number,
  number,
  number,
] => [
  qu + EDGE_INSET,
  qv + EDGE_INSET,
  qu + 2 - EDGE_INSET,
  qv + 2 - EDGE_INSET,
];

/** La place centrale : le carré du milieu. */
export const PLAZA: [number, number] = [3, 3];

/** Îlot (i, j) de chaque bâtiment : son quartier est le carré qui le contient. */
export const BLOCK: Record<SectionId, [number, number]> = {
  // Projets : en haut à droite de la place
  projets: [3, 0],
  accueil: [3, 1],
  calendrier: [4, 1],
  // Production : à droite
  producteurs: [6, 0],
  planning: [6, 1],
  fournisseurs: [7, 1],
  // Clients : en haut à gauche de la place
  clients: [0, 3],
  premium: [1, 3],
  leads: [0, 4],
  campagnes: [1, 4],
  // Assistance : en bas à droite de la place
  tickets: [6, 3],
  ia: [7, 3],
  utilisateurs: [6, 4],
  parametres: [7, 4],
  // Boutique : à gauche
  boutique: [0, 6],
  attributs: [1, 6],
  bannieres: [1, 7],
  // Finance : en bas à gauche de la place
  finance: [3, 6],
  devis: [4, 6],
  generateurs: [3, 7],
};

/**
 * Îlots sans bâtiment dans les quartiers : un jardin, la terrasse de café
 * (devant la Finance) ; aux deux pointes de l'île, une cour et un jardin
 * (à demi coupés par le bord de la carte, exprès).
 */
export const SPOTS: {
  cell: [number, number];
  kind: 'jardin' | 'cour' | 'terrasse';
}[] = [
  { cell: [4, 0], kind: 'jardin' },
  { cell: [7, 0], kind: 'cour' },
  { cell: [0, 7], kind: 'jardin' },
  { cell: [4, 7], kind: 'terrasse' },
];

/** Centre (u, v) de la parcelle d'un bâtiment. */
export const blockCenter = (id: SectionId): [number, number] => {
  const [u0, v0, u1, v1] = plotOf(...BLOCK[id]);
  return [(u0 + u1) / 2, (v0 + v1) / 2];
};

export interface BuildingSpec {
  /** Emprise au sol (le long de u, de v) et hauteur des murs (px). */
  w: number;
  d: number;
  h: number;
  /** Ce qui dépasse du toit (px : grue, dôme, éolienne, roues dentées…). */
  top: number;
  /** Ce qui dépasse sur la droite (px : la flèche de la grue), pour les vignettes. */
  reach?: number;
}

/**
 * Les vingt bâtiments, bien plus petits que leur parcelle (de la pelouse
 * tout autour) : plus hauts au fond de chaque quartier, plus bas devant. La
 * tour en chantier des Projets domine la ville. La feuille du Devis est
 * mince, comme une feuille.
 */
export const BUILDINGS: Record<SectionId, BuildingSpec> = {
  projets: { w: 0.42, d: 0.42, h: 120, top: 48, reach: 14 },
  accueil: { w: 0.46, d: 0.42, h: 50, top: 30 },
  calendrier: { w: 0.42, d: 0.4, h: 70, top: 8 },
  producteurs: { w: 0.48, d: 0.42, h: 46, top: 54 },
  planning: { w: 0.42, d: 0.4, h: 72, top: 28 },
  fournisseurs: { w: 0.5, d: 0.42, h: 28, top: 22 },
  clients: { w: 0.46, d: 0.42, h: 92, top: 44 },
  premium: { w: 0.42, d: 0.42, h: 68, top: 46 },
  leads: { w: 0.4, d: 0.4, h: 76, top: 22 },
  campagnes: { w: 0.42, d: 0.4, h: 52, top: 34 },
  tickets: { w: 0.44, d: 0.42, h: 76, top: 32 },
  ia: { w: 0.42, d: 0.42, h: 60, top: 22 },
  utilisateurs: { w: 0.4, d: 0.4, h: 70, top: 36 },
  parametres: { w: 0.42, d: 0.4, h: 44, top: 40 },
  boutique: { w: 0.46, d: 0.42, h: 60, top: 32 },
  attributs: { w: 0.42, d: 0.42, h: 58, top: 4 },
  bannieres: { w: 0.42, d: 0.38, h: 54, top: 44 },
  finance: { w: 0.46, d: 0.42, h: 66, top: 22 },
  devis: { w: 0.4, d: 0.18, h: 66, top: 4 },
  generateurs: { w: 0.4, d: 0.4, h: 40, top: 64 },
};

/** Recul des bâtiments vers le fond de leur parcelle (pelouse devant). */
const BACK = 0.04;

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
  const { h, top, reach = 0 } = BUILDINGS[id];
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
  const m = 9;
  const x = Math.min(...xs) - m;
  const y = Math.min(...ys) - m;
  return [x, y, Math.max(...xs) + m + reach - x, Math.max(...ys) + m - y];
};

/** Point de la carte où se pose la pointe de l'étiquette (au-dessus du toit). */
export const labelAnchor = (id: SectionId): [number, number] => {
  const [u0, v0, u1, v1] = footprint(id);
  const { h, top } = BUILDINGS[id];
  return iso((u0 + u1) / 2, (v0 + v1) / 2, h + top + 12);
};

/** Point visé par la caméra pour un bâtiment (le milieu de sa façade). */
export const buildingCenter = (id: SectionId): [number, number] => {
  const [cu, cv] = blockCenter(id);
  return iso(cu, cv, BUILDINGS[id].h * 0.45);
};

/** Point visé par la caméra pour un quartier (le milieu de son carré). */
export const districtCenter = (id: DistrictId): [number, number] => {
  const quad = QUADS.find((q) => q.kind === id) as (typeof QUADS)[number];
  return iso(quad.q[0] + 1, quad.q[1] + 1, 40);
};

/** Profondeur d'un objet posé en (u, v) : du fond vers l'avant. */
export const depthOf = (u: number, v: number) => u + v;

// ── Verdure et vie ───────────────────────────────────────────────────────────

export interface Tree {
  u: number;
  v: number;
  /** Taille relative (1 = arbre moyen). */
  s: number;
  /** Feuillu rond ou conifère. */
  kind?: 'round' | 'pine';
}

/** Rangées d'arbres le long des boulevards, sur les deux pelouses. */
const boulevardTrees = (): Tree[] => {
  const out: Tree[] = [];
  const along = [0.5, 1.5, 3.5, 4.5, 6.5, 7.5];
  BOULEVARDS.forEach((b, bi) =>
    along.forEach((t, ti) => {
      const s = 0.5 + ((bi + ti) % 3) * 0.05;
      for (const side of [-0.31, 0.31]) {
        out.push({ u: b + side, v: t, s });
        out.push({ u: t, v: b + side, s });
      }
    })
  );
  return out;
};

/**
 * Une rangée d'arbres de la ceinture verte, le long d'un bord de l'île — en
 * laissant passer les boulevards, qui filent jusqu'au bord.
 */
const belt = (at: (x: number) => [number, number]): Tree[] =>
  [0.4, 1.4, 3.6, 4.6, 6.4, 7.4].map((x, k) => {
    const [u, v] = at(x);
    return { u, v, s: 0.55 + (k % 3) * 0.06, kind: k % 3 ? 'round' : 'pine' };
  });

/**
 * Arbres : le bois du fond (autour de l'étang), le parc de devant, les
 * jardins, les angles de la place, les rangées des boulevards et la ceinture
 * verte des deux bords du fond de l'île.
 */
export const TREES: Tree[] = [
  // Le bois du fond (carré 0, 0), autour de l'étang
  { u: 0.32, v: 0.3, s: 0.82, kind: 'pine' },
  { u: 0.78, v: 0.26, s: 0.7 },
  { u: 1.24, v: 0.28, s: 0.8, kind: 'pine' },
  { u: 1.7, v: 0.34, s: 0.72 },
  { u: 0.28, v: 0.76, s: 0.74 },
  { u: 1.74, v: 0.84, s: 0.84, kind: 'pine' },
  { u: 0.3, v: 1.3, s: 0.76, kind: 'pine' },
  { u: 0.36, v: 1.74, s: 0.68 },
  { u: 0.86, v: 1.76, s: 0.78 },
  { u: 1.8, v: 1.3, s: 0.7, kind: 'pine' },
  // Le parc de devant (carré 6, 6)
  { u: 6.3, v: 6.3, s: 0.78 },
  { u: 6.82, v: 6.26, s: 0.68, kind: 'pine' },
  { u: 7.4, v: 6.34, s: 0.76 },
  { u: 6.28, v: 6.84, s: 0.7 },
  { u: 7.2, v: 7.1, s: 0.84 },
  { u: 6.76, v: 7.5, s: 0.72, kind: 'pine' },
  // Jardins des quartiers
  { u: 4.3, v: 0.36, s: 0.7 },
  { u: 4.64, v: 0.7, s: 0.62, kind: 'pine' },
  { u: 7.4, v: 0.4, s: 0.62 },
  { u: 0.4, v: 7.5, s: 0.66 },
  { u: 4.68, v: 7.66, s: 0.6 },
  // Angles de la place
  { u: 3.42, v: 3.42, s: 0.58 },
  { u: 4.58, v: 3.42, s: 0.58 },
  { u: 3.42, v: 4.58, s: 0.58 },
  { u: 4.58, v: 4.58, s: 0.58 },
  // Les boulevards plantés
  ...boulevardTrees(),
  // La ceinture verte des deux bords du fond
  ...belt((x) => [x, -0.38]),
  ...belt((x) => [-0.38, x]),
];

/** Buissons : au pied des bâtiments, aux coins avant de leur parcelle. */
export const BUSHES: { u: number; v: number; s: number }[] = (
  Object.keys(BLOCK) as SectionId[]
).flatMap((id) => {
  const [u0, v0, u1, v1] = plotOf(...BLOCK[id]);
  return [
    { u: u1 - 0.07, v: v1 - 0.07, s: 1 },
    { u: u0 + 0.07, v: v1 - 0.07, s: 0.8 },
    { u: u1 - 0.07, v: v0 + 0.07, s: 0.8 },
  ];
});

/** Massifs de fleurs : sur la place, dans les jardins, au bord de l'étang. */
export const FLOWERS: { u: number; v: number; color: string }[] = [
  { u: 3.6, v: 3.6, color: '#f472b6' },
  { u: 4.4, v: 3.6, color: '#fbbf24' },
  { u: 3.6, v: 4.4, color: '#a78bfa' },
  { u: 4.4, v: 4.4, color: '#fb7185' },
  { u: 4.42, v: 0.7, color: '#f472b6' },
  { u: 1.05, v: 1.62, color: '#fbbf24' },
  { u: 0.66, v: 0.62, color: '#fb7185' },
  { u: 6.6, v: 6.6, color: '#a78bfa' },
];

/** Bancs : orientés le long de u ou de v. */
export const BENCHES: { u: number; v: number; along: 'u' | 'v' }[] = [
  { u: 4, v: 3.4, along: 'u' },
  { u: 4.6, v: 4, along: 'v' },
  { u: 4, v: 4.6, along: 'u' },
  { u: 3.4, v: 4, along: 'v' },
  { u: 0.6, v: 1.62, along: 'u' },
  { u: 6.72, v: 6.7, along: 'u' },
];

/** La fontaine de la place, l'étang du bois, l'aire de jeux, le pique-nique. */
export const FOUNTAIN = { u: 4, v: 4, r: 0.24 };
export const POND = { u: 0.98, v: 1.06, ru: 0.38, rv: 0.28 };
export const PLAYGROUND = { u: 1.5, v: 1.6 };
export const PICNIC = { u: 1.42, v: 0.62 };

/** La terrasse de café (îlot 4, 7) : tables sous parasol. */
export const TERRACE: { u: number; v: number; color: string }[] = [
  { u: 4.3, v: 7.3, color: '#ec4899' },
  { u: 4.62, v: 7.26, color: '#f59e0b' },
  { u: 4.32, v: 7.62, color: '#14b8a6' },
];

/** La cour des ateliers (îlot 7, 0) : cartons ; quelques-uns devant l'entrepôt. */
export const YARD: { u: number; v: number; h: number }[] = [
  { u: 7.3, v: 0.5, h: 14 },
  { u: 7.42, v: 0.5, h: 10 },
  { u: 7.3, v: 0.64, h: 10 },
  { u: 7.86, v: 1.84, h: 12 },
];

/** Bande de chaussée d'un boulevard (le long de u si `along` vaut 'u'). */
const band = (
  along: 'u' | 'v',
  at: number,
  half: number,
  from: number,
  to: number
) =>
  along === 'u'
    ? pathOf([
        iso(from, at - half),
        iso(to, at - half),
        iso(to, at + half),
        iso(from, at + half),
      ])
    : pathOf([
        iso(at - half, from),
        iso(at + half, from),
        iso(at + half, to),
        iso(at - half, to),
      ]);

/** Les boulevards : chaussées d'un bord de l'île à l'autre. */
export const avenues = (): string[] => {
  const e = CITY_EDGE - 0.08;
  return BOULEVARDS.flatMap((b) => [
    band('v', b, ROAD, -e, GRID + e),
    band('u', b, ROAD, -e, GRID + e),
  ]);
};

/** Marquages au sol : tirets blancs au milieu des boulevards, entre les carrefours. */
export const laneDashes = (): string => {
  const parts: string[] = [];
  const seg = (a: [number, number], b: [number, number]) =>
    parts.push(`M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])}`);
  const stops = [-CITY_EDGE + 0.1, ...BOULEVARDS, GRID + CITY_EDGE - 0.1];
  for (const b of BOULEVARDS)
    for (let k = 1; k < stops.length; k++) {
      const a0 = stops[k - 1] + (k === 1 ? 0 : ROAD + 0.1);
      const a1 = stops[k] - (k === stops.length - 1 ? 0 : ROAD + 0.1);
      seg(iso(b, a0), iso(b, a1));
      seg(iso(a0, b), iso(a1, b));
    }
  return parts.join(' ');
};

/**
 * Les allées piétonnes : la croix qui traverse chaque quartier, prolongée à
 * travers la pelouse jusqu'au boulevard voisin.
 */
export const footpaths = (): string[] =>
  QUADS.filter((q) => q.kind !== 'place' && q.kind !== 'parc').flatMap(
    ({ q: [qu, qv] }) => {
      // Jusqu'au boulevard de chaque côté (sauf au bord de l'île).
      const ext = (o: number, end: 0 | 2) =>
        end === 0
          ? o === 0
            ? o + 0.04
            : o - 0.5 + ROAD
          : o === 6
            ? o + 1.96
            : o + 2.5 - ROAD;
      return [
        band('v', qu + 1, LANE, ext(qv, 0), ext(qv, 2)),
        band('u', qv + 1, LANE, ext(qu, 0), ext(qu, 2)),
      ];
    }
  );

/** Sentiers du bois : de l'étang jusqu'aux deux boulevards voisins. */
export const parkPaths = (): string[] => [
  band('u', POND.v, 0.03, POND.u + POND.ru + 0.17, BOULEVARDS[0] - ROAD),
  band('v', POND.u, 0.03, POND.v + POND.rv + 0.17, BOULEVARDS[0] - ROAD),
];

/**
 * Passages piétons autour de la place : là où l'allée de chaque quartier
 * voisin traverse le boulevard pour y entrer.
 */
export const crosswalks = (): string => {
  const [i, j] = PLAZA;
  const stripes: string[] = [];
  const zebra = (u0: number, v0: number, u1: number, v1: number) =>
    stripes.push(pathOf([iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)]));
  // En travers des boulevards u = 2,5 et u = 5,5, face à l'allée v = j + 1
  for (const k of BOULEVARDS)
    for (let s = -2; s <= 2; s++) {
      const u = k + s * 0.045;
      zebra(u - 0.013, j + 1 - 0.09, u + 0.013, j + 1 + 0.09);
    }
  // En travers des boulevards v = 2,5 et v = 5,5, face à l'allée u = i + 1
  for (const k of BOULEVARDS)
    for (let s = -2; s <= 2; s++) {
      const v = k + s * 0.045;
      zebra(i + 1 - 0.09, v - 0.013, i + 1 + 0.09, v + 0.013);
    }
  return stripes.join(' ');
};

/** Trajet d'un passant, d'un vélo, d'une voiture : points (u, v) au sol. */
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

/** Boucle au sol (ellipse fermée), en points (u, v). */
const loop = (
  cu: number,
  cv: number,
  ru: number,
  rv: number,
  n = 28
): [number, number][] =>
  Array.from({ length: n + 1 }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return [cu + ru * Math.cos(a), cv + rv * Math.sin(a)];
  });

const route = (pts: [number, number][], speed: number): Route => ({
  pts,
  duration: Math.round(routeLength(pts) / speed),
});

/** Le chemin autour de l'étang (passants), un peu plus large que l'eau. */
export const POND_WALK = { ru: POND.ru + 0.17, rv: POND.rv + 0.17 };

/**
 * Passants : sur les trottoirs des boulevards, dans les allées des
 * quartiers, autour de la fontaine et de l'étang.
 */
export const WALKERS: Route[] = [
  route(
    [
      [-0.3, 2.33],
      [8.3, 2.33],
    ],
    15
  ),
  route(
    [
      [5.67, 8.3],
      [5.67, -0.3],
    ],
    15
  ),
  route(
    [
      [8.3, 5.67],
      [-0.3, 5.67],
    ],
    15
  ),
  route(
    [
      [2.33, -0.3],
      [2.33, 8.3],
    ],
    15
  ),
  route(
    [
      [4, 0.1],
      [4, 2.35],
    ],
    12
  ),
  route(
    [
      [0.1, 4],
      [2.35, 4],
    ],
    12
  ),
  route(loop(FOUNTAIN.u, FOUNTAIN.v, 0.42, 0.42), 12),
  route(loop(POND.u, POND.v, POND_WALK.ru, POND_WALK.rv), 12),
];

/** Cyclistes : sur les boulevards, d'un bord de l'île à l'autre. */
export const CYCLISTS: Route[] = [
  route(
    [
      [5.56, -0.6],
      [5.56, 8.6],
    ],
    26
  ),
  route(
    [
      [8.6, 2.56],
      [-0.6, 2.56],
    ],
    26
  ),
];

/** Voitures : sur les boulevards, d'un bord de l'île à l'autre (axe de la voiture). */
export const CARS: (Route & { axis: 'u' | 'v'; color: string })[] = [
  {
    ...route(
      [
        [2.56, 8.8],
        [2.56, -0.8],
      ],
      40
    ),
    axis: 'v',
    color: '#3b82f6',
  },
  {
    ...route(
      [
        [-0.8, 5.44],
        [8.8, 5.44],
      ],
      40
    ),
    axis: 'u',
    color: '#f97316',
  },
  {
    ...route(
      [
        [5.44, -0.8],
        [5.44, 8.8],
      ],
      40
    ),
    axis: 'v',
    color: '#14b8a6',
  },
  {
    ...route(
      [
        [8.8, 2.44],
        [-0.8, 2.44],
      ],
      40
    ),
    axis: 'u',
    color: '#e11d48',
  },
];

/** Canards de l'étang : une petite boucle sur l'eau. */
export const DUCKS: Route = route(
  loop(POND.u, POND.v, POND.ru * 0.55, POND.rv * 0.5),
  6
);

/**
 * Camions de livraison : ils partent des ateliers, longent le boulevard
 * devant la Production et quittent l'île par l'est.
 */
export const TRUCK_ROUTE: Route = route(
  [
    [6.3, 2.56],
    [8.9, 2.56],
  ],
  30
);

// ── Échanges entre les bâtiments ─────────────────────────────────────────────

/** Porte d'un bâtiment : le point du boulevard le plus proche de lui. */
export const doorOf = (id: SectionId): [number, number] => {
  const [cu, cv] = blockCenter(id);
  const near = (x: number) =>
    BOULEVARDS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  const bu = near(cu);
  const bv = near(cv);
  return Math.abs(bu - cu) <= Math.abs(bv - cv) ? [bu, cv] : [cu, bv];
};

/**
 * Trajet par les boulevards d'une porte à l'autre : tout droit sur le même
 * boulevard, par le carrefour s'ils se croisent, sinon par un boulevard
 * transversal — jamais à travers un quartier, la place ou un parc.
 */
export const streetRoute = (
  from: SectionId,
  to: SectionId
): [number, number][] => {
  const [ua, va] = doorOf(from);
  const [ub, vb] = doorOf(to);
  const onU = (u: number) => BOULEVARDS.includes(u);
  const aU = onU(ua);
  const bU = onU(ub);
  let pts: [number, number][];
  if (aU && bU)
    pts =
      ua === ub
        ? [
            [ua, va],
            [ub, vb],
          ]
        : (() => {
            const m = BOULEVARDS.reduce((x, y) =>
              Math.abs(y - (va + vb) / 2) < Math.abs(x - (va + vb) / 2) ? y : x
            );
            return [
              [ua, va],
              [ua, m],
              [ub, m],
              [ub, vb],
            ] as [number, number][];
          })();
  else if (!aU && !bU)
    pts =
      va === vb
        ? [
            [ua, va],
            [ub, vb],
          ]
        : (() => {
            const m = BOULEVARDS.reduce((x, y) =>
              Math.abs(y - (ua + ub) / 2) < Math.abs(x - (ua + ub) / 2) ? y : x
            );
            return [
              [ua, va],
              [m, va],
              [m, vb],
              [ub, vb],
            ] as [number, number][];
          })();
  else if (aU)
    pts = [
      [ua, va],
      [ua, vb],
      [ub, vb],
    ];
  else
    pts = [
      [ua, va],
      [ub, va],
      [ub, vb],
    ];
  return pts.filter(
    (p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]
  );
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
 * carte (`top`) : une étiquette dont la pointe est trop haute (la grue des
 * Projets sur un petit écran) descend d'abord juste assez pour y tenir. Si
 * rien ne suffit, le plus petit chevauchement l'emporte.
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
    const down = Math.max(0, top - (l.y - l.h));
    let best: LabelPlace = { dx: 0, dy: down };
    let bestCost = Infinity;
    // Plus on monte, plus ça coûte : on s'arrête dès que monter ne peut plus gagner.
    for (
      let dy = down;
      dy >= down - 1.5 * l.h && 1.5 * (down - dy) < bestCost;
      dy -= 2
    ) {
      for (let s = 0; ; s += 2) {
        const step = Math.min(s, maxX);
        for (const dx of step ? [-step, step] : [0]) {
          const b = box(l, dx, dy);
          const clash =
            others.reduce((sum, p) => sum + overlap(b, p), 0) +
            Math.max(0, top - b.y0) * l.w;
          const cost = clash * 1e4 + Math.abs(dx) + 1.5 * (down - dy);
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
