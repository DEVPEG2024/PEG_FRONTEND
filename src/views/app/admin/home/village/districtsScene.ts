// « PEG DISTRICTS » (accueil admin, 22/10/2026) : la ville est un rendu 3D —
// une image —, et tout ce qui est interactif est posé par-dessus : une carte
// par quartier, les trois sites de production numérotés, la ligne de
// production lumineuse, et la vie de la ville (réseau des échanges, routes,
// voies d'eau, vols, façades, fontaines). Ce module place ces repères en
// pixels de l'image et calcule le cadrage (remplir le cadre, zoom,
// déplacement).
//
// Ne dépend ni de React ni du navigateur : il est testé tel quel.

import { plural, type VillageData } from './villageModel';
import { districtOf, type DistrictId, type SectionId } from './villageScene';

type Pt = [number, number];

/** Le rendu de la ville et sa taille réelle, en pixels. */
export const CITY_IMAGE = {
  src: '/img/ville/peg-districts.webp',
  w: 1672,
  h: 941,
} as const;

export interface DistrictSpot {
  id: DistrictId;
  /** Centre de la carte du quartier, en pixels de l'image. */
  card: Pt;
  /** Halo au survol : centre et rayon (pixels de l'image). */
  glow: Pt;
  radius: number;
}

/**
 * Les six quartiers sur l'image, d'après la maquette : les clients dans la
 * tour et le bâtiment rond (haut gauche), les projets sur le campus (haut),
 * la boutique dans le grand bâtiment vitré (droite), la production dans les
 * trois entrepôts (centre), la finance dans l'immeuble blanc (bas droite),
 * l'assistance dans le pavillon voisin.
 */
export const DISTRICT_SPOTS: DistrictSpot[] = [
  { id: 'clients', card: [350, 92], glow: [400, 205], radius: 175 },
  { id: 'projets', card: [915, 40], glow: [912, 195], radius: 185 },
  { id: 'boutique', card: [1390, 128], glow: [1338, 322], radius: 200 },
  { id: 'production', card: [772, 336], glow: [690, 545], radius: 270 },
  { id: 'finance', card: [1440, 560], glow: [1366, 700], radius: 125 },
  { id: 'assistance', card: [1120, 676], glow: [1210, 752], radius: 75 },
];

/** Les trois sites de production numérotés (repère posé sur leur toit). */
export const PRODUCTION_SITES: { id: SectionId; n: number; at: Pt }[] = [
  { id: 'producteurs', n: 1, at: [432, 500] },
  { id: 'planning', n: 2, at: [764, 452] },
  { id: 'fournisseurs', n: 3, at: [918, 604] },
];

/**
 * La ligne de production (le tube violet de l'image) : de l'atelier vers le
 * site 2 par le grand coude, et le tube court qui les relie par le haut.
 */
export const CONVEYOR: Pt[] = [
  [520, 570],
  [658, 656],
  [835, 578],
  [763, 531],
];
export const CONVEYOR_SHORT: Pt[] = [
  [585, 543],
  [672, 507],
];

/**
 * Les pôles du réseau, sur le toit des bâtiments d'où partent et où arrivent
 * les arcs des échanges (pixels de l'image) : le bâtiment rond des clients
 * (le haut de la tour est sous leur carte), le cube de verre du campus des
 * projets, le toit planté de la boutique, les trois entrepôts (atelier,
 * planning, fournisseurs — à côté de leur repère numéroté), l'immeuble de la
 * finance (les devis à gauche du toit, la finance à droite), le pavillon de
 * l'assistance (tickets et IA).
 */
export const ROOFS: Partial<Record<SectionId, Pt>> = {
  clients: [338, 190],
  projets: [920, 178],
  boutique: [1385, 240],
  producteurs: [440, 470],
  planning: [700, 415],
  fournisseurs: [850, 565],
  devis: [1310, 650],
  finance: [1408, 628],
  tickets: [1210, 745],
  ia: [1210, 745],
};

/**
 * Arc d'un échange entre deux toits : une courbe qui monte d'autant plus
 * haut que les bâtiments sont loin l'un de l'autre — assez bas pour ne pas
 * passer sur un troisième pôle. `bend` < 1 : une courbe plus basse, pour
 * l'échange retour entre deux mêmes bâtiments (les deux arcs font un œil).
 */
export const arcPath = (a: Pt, b: Pt, bend = 1) => {
  const lift = (50 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.2) * bend;
  const c: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - lift];
  return `M${a[0]} ${a[1]} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${b[0]} ${b[1]}`;
};

/**
 * Les routes où roule la circulation (`cars` voitures dans chaque sens),
 * relevées sur l'image, voitures de la photo comprises : le pont et la route
 * du bord de l'eau jusqu'au coude du canal ; le boulevard sous la place des
 * clients, prolongé devant le campus jusqu'à la boutique ; le quai qui longe
 * le fleuve ; la boucle au sud de la finance ; l'avenue à gauche de la place
 * des clients ; la rue qui monte vers la tour ; l'avenue à l'est de la
 * boutique et la rue qui passe au sud de la boutique.
 */
export const ROADS: { id: string; pts: Pt[]; cars: number }[] = [
  {
    id: 'riviere',
    pts: [
      [115, 820],
      [210, 790],
      [300, 760],
      [375, 736],
      [490, 752],
      [580, 780],
      [680, 804],
      [775, 817],
      [850, 820],
      [915, 806],
      [990, 772],
      [1044, 752],
      [1100, 727],
      [1160, 700],
      [1191, 666],
      [1213, 627],
    ],
    cars: 7,
  },
  {
    id: 'boulevard',
    pts: [
      [30, 490],
      [150, 455],
      [300, 410],
      [440, 377],
      [517, 341],
      [590, 303],
      [680, 258],
      [760, 290],
      [860, 318],
      [960, 330],
      [997, 325],
      [1030, 315],
      [1070, 297],
      [1110, 277],
      [1150, 253],
    ],
    cars: 6,
  },
  {
    id: 'quai',
    pts: [
      [40, 492],
      [64, 500],
      [80, 510],
      [84, 535],
      [97, 560],
      [117, 580],
      [150, 600],
      [200, 630],
      [250, 650],
      [300, 668],
      [340, 686],
      [370, 703],
      [395, 722],
      [440, 738],
      [490, 752],
    ],
    cars: 3,
  },
  {
    id: 'sud',
    pts: [
      [1005, 768],
      [1035, 778],
      [1062, 793],
      [1120, 825],
      [1180, 862],
      [1240, 887],
      [1290, 895],
      [1340, 882],
      [1400, 857],
      [1460, 830],
      [1510, 808],
      [1570, 780],
      [1640, 745],
    ],
    cars: 4,
  },
  {
    id: 'gauche',
    pts: [
      [0, 198],
      [50, 234],
      [100, 272],
      [150, 304],
      [200, 337],
      [250, 367],
      [300, 402],
    ],
    cars: 3,
  },
  {
    id: 'tour',
    pts: [
      [680, 258],
      [650, 236],
      [612, 206],
      [580, 180],
      [556, 158],
    ],
    cars: 2,
  },
  {
    id: 'est',
    pts: [
      [1462, 222],
      [1520, 288],
      [1580, 340],
      [1630, 386],
      [1672, 424],
    ],
    cars: 3,
  },
  {
    id: 'boutique-sud',
    pts: [
      [1420, 476],
      [1500, 452],
      [1560, 422],
      [1590, 402],
    ],
    cars: 2,
  },
];

/**
 * Les drones : des boucles au-dessus des toits (une grande au-dessus de toute
 * la ville, une autour de la finance et de l'assistance, une au-dessus de la
 * production). Leur ombre suit au sol.
 */
export const DRONE_LOOPS: Pt[][] = [
  [
    [1385, 200],
    [1150, 150],
    [920, 120],
    [650, 110],
    [360, 140],
    [300, 260],
    [520, 330],
    [800, 300],
    [1100, 290],
  ],
  [
    [1330, 560],
    [1240, 640],
    [1120, 700],
    [1000, 660],
    [1080, 560],
    [1220, 520],
  ],
  [
    [420, 430],
    [600, 400],
    [800, 420],
    [940, 520],
    [760, 600],
    [520, 600],
    [400, 520],
  ],
];

/** Deux vols d'oiseaux qui traversent le ciel brumeux du fond, dans les deux sens. */
export const BIRD_PATHS: Pt[][] = [
  [
    [-80, 95],
    [500, 60],
    [1100, 50],
    [1760, 30],
  ],
  [
    [1760, 150],
    [1200, 120],
    [600, 125],
    [-80, 100],
  ],
];

/** Feu rouge clignotant en haut de l'antenne de la tour des clients. */
export const BEACONS: Pt[] = [[497, 68]];

/** Le néon violet de la tour : une bande verticale (centre x, haut, bas, largeur). */
export const TOWER_NEON = { x: 522.5, top: 139, bottom: 241, w: 10 };

/** Les fontaines : la place des clients, le campus, les deux du toit de la boutique (`h` = hauteur du jet). */
export const FOUNTAINS: { at: Pt; h: number }[] = [
  { at: [386, 300], h: 24 },
  { at: [914, 285], h: 26 },
  { at: [1371, 246], h: 11 },
  { at: [1412, 274], h: 9 },
];

/**
 * Les façades vitrées où passe un reflet (polygones) : la tour des clients,
 * le cube de verre du campus, la grande façade de la boutique et sa verrière
 * violette.
 */
export const GLASS: Pt[][] = [
  [
    [439, 104],
    [490, 129],
    [490, 242],
    [439, 215],
  ],
  [
    [880, 191],
    [922, 169],
    [968, 195],
    [968, 232],
    [925, 254],
    [880, 232],
  ],
  [
    [1264, 272],
    [1366, 332],
    [1366, 442],
    [1264, 372],
  ],
  [
    [1174, 280],
    [1232, 306],
    [1232, 370],
    [1174, 340],
  ],
];

/** Les bateaux : sur le canal, du second pont au bassin, et sur le fleuve jusqu'au pont. */
export const WATERWAYS: { id: string; pts: Pt[] }[] = [
  {
    id: 'canal',
    pts: [
      [1150, 497],
      [1220, 531],
      [1287, 572],
      [1335, 597],
    ],
  },
  {
    id: 'fleuve',
    pts: [
      [8, 655],
      [60, 676],
      [115, 700],
      [165, 728],
    ],
  },
];

/** Les camions de livraison : des quais de l'entrepôt au pont, puis hors de la ville. */
export const DELIVERY_ROUTE: Pt[] = [
  [965, 742],
  [990, 772],
  [915, 806],
  [850, 820],
  [775, 817],
  [680, 804],
  [580, 780],
  [490, 752],
  [375, 736],
  [300, 760],
  [210, 790],
  [115, 820],
];

/**
 * Chemin SVG lissé passant par chaque point (pixels de l'image) : les
 * véhicules tournent en douceur aux virages au lieu de pivoter d'un coup.
 */
export const smoothPath = (pts: Pt[]) => {
  const at = (i: number) => pts[Math.min(pts.length - 1, Math.max(0, i))];
  const f = (v: number) => Number(v.toFixed(1));
  return pts.slice(1).reduce((d, p, k) => {
    const [p0, p1, p3] = [at(k - 1), at(k), at(k + 2)];
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
    const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
    return `${d} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${p[0]} ${p[1]}`;
  }, `M${pts[0][0]} ${pts[0][1]}`);
};

/** Même lissage pour une boucle fermée (les drones) : on revient au départ sans angle. */
export const smoothLoop = (pts: Pt[]) => {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n];
  const f = (v: number) => Number(v.toFixed(1));
  return pts.reduce((d, p1, k) => {
    const [p0, p2, p3] = [at(k - 1), at(k + 1), at(k + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `${d} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${p2[0]} ${p2[1]}`;
  }, `M${pts[0][0]} ${pts[0][1]}`);
};

/** Chemin SVG d'un polygone fermé (façades vitrées). */
export const polygonPath = (pts: Pt[]) =>
  `M${pts.map((p) => `${p[0]} ${p[1]}`).join(' L')} Z`;

/** Rectangle englobant d'un polygone : [x, y, largeur, hauteur]. */
export const bounds = (pts: Pt[]): [number, number, number, number] => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
};

/** Les biefs où l'eau scintille : entre les deux ponts du canal, le bassin du canal, le fleuve. */
const GLINT_STRETCHES: [Pt, Pt][] = [
  [
    [983, 372],
    [1080, 440],
  ],
  [
    [1150, 497],
    [1335, 597],
  ],
  [
    [8, 655],
    [165, 728],
  ],
];

/** Reflets sur l'eau : des points tous les 22 px environ, de part et d'autre du milieu du bief. */
export const WATER_GLINTS: Pt[] = GLINT_STRETCHES.flatMap(([a, b]) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const count = Math.max(3, Math.round(len / 22));
  const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
  return Array.from({ length: count }, (_, k): Pt => {
    const t = (k + 0.5) / count;
    const off = (k % 2 ? -1 : 1) * (3 + (k % 3) * 3);
    return [
      Math.round(a[0] + (b[0] - a[0]) * t + nx * off),
      Math.round(a[1] + (b[1] - a[1]) * t + ny * off),
    ];
  });
});

/**
 * Où se pose la bulle d'une activité : le pôle de sa rubrique, son site de
 * production, sinon le cœur de son quartier.
 */
export const sectionAnchor = (id: SectionId): Pt =>
  ROOFS[id] ??
  PRODUCTION_SITES.find((s) => s.id === id)?.at ??
  DISTRICT_SPOTS.find((d) => d.id === districtOf(id))?.glow ??
  CITY_FOCUS;

/** Longueur d'une ligne de points (pixels de l'image). */
export const pointsLength = (pts: Pt[]) =>
  pts
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]),
      0
    );

/** Le cœur de la ville : là où se pose le regard quand rien n'est visé. */
export const CITY_FOCUS: Pt = [860, 440];

export const DISTRICT_ZOOM_MAX = 2.2;

export interface Camera {
  /** Échelle : pixels écran par pixel d'image. */
  k: number;
  tx: number;
  ty: number;
}

/**
 * Cadrage : l'image remplit le cadre (aucun bord vide), agrandie de `zoom`,
 * centrée autant que possible sur `focus` (pixels de l'image).
 */
export const cityCamera = (
  frameW: number,
  frameH: number,
  zoom = 1,
  focus: Pt = CITY_FOCUS
): Camera => {
  const k =
    Math.max(frameW / CITY_IMAGE.w, frameH / CITY_IMAGE.h) *
    Math.min(DISTRICT_ZOOM_MAX, Math.max(1, zoom));
  const clamp = (v: number, lo: number) => Math.min(0, Math.max(lo, v));
  return {
    k,
    tx: clamp(frameW / 2 - focus[0] * k, frameW - CITY_IMAGE.w * k),
    ty: clamp(frameH / 2 - focus[1] * k, frameH - CITY_IMAGE.h * k),
  };
};

/** Point de l'image → point du cadre. */
export const toFrame = (c: Camera, [x, y]: Pt): Pt => [
  x * c.k + c.tx,
  y * c.k + c.ty,
];

/** Point du cadre → point de l'image (inverse de toFrame). */
export const toImage = (c: Camera, [x, y]: Pt): Pt => [
  (x - c.tx) / c.k,
  (y - c.ty) / c.k,
];

/** Point de l'image au centre du cadre pour une caméra donnée. */
export const focusOfCamera = (c: Camera, frameW: number, frameH: number) =>
  toImage(c, [frameW / 2, frameH / 2]);

/**
 * Une carte de quartier reste entière dans le cadre : son centre est poussé
 * vers l'intérieur s'il le faut (marge `m`).
 */
export const keepInside = (
  [x, y]: Pt,
  w: number,
  h: number,
  frameW: number,
  frameH: number,
  m = 12
): Pt => [
  Math.min(Math.max(x, m + w / 2), Math.max(m + w / 2, frameW - m - w / 2)),
  Math.min(Math.max(y, m + h / 2), Math.max(m + h / 2, frameH - m - h / 2)),
];

/** Un rectangle du cadre, par son centre et sa taille ; `gap` : l'écart à garder (10 par défaut). */
export interface Box {
  at: Pt;
  w: number;
  h: number;
  gap?: number;
}

/**
 * Les cartes des quartiers ne se recouvrent jamais, ni entre elles ni sur les
 * repères fixes (`obstacles`, les sites de production) : une carte hors champ
 * (au zoom, ou dans un cadre étroit) est ramenée au bord et peut tomber sur
 * une autre. Les cartes posées sur leur bâtiment gardent leur place ; une
 * carte qui en recouvre une autre prend la place libre la plus proche, côte à
 * côte de préférence, sans quitter le cadre.
 */
export const spreadCards = (
  pts: Pt[],
  w: number,
  h: number,
  frameW: number,
  frameH: number,
  obstacles: Box[] = []
): Pt[] => {
  const m = 12;
  const wanted = pts.map((p) => keepInside(p, w, h, frameW, frameH, m));
  const order = wanted
    .map((q, i) => ({ i, off: Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]) }))
    .sort((a, b) => a.off - b.off || a.i - b.i);
  const out = [...wanted];
  const placed: Box[] = [...obstacles];
  // Distances minimales entre le centre d'une carte et celui d'un rectangle posé.
  const dx = (q: Box) => (w + q.w) / 2 + (q.gap ?? 10);
  const dy = (q: Box) => (h + q.h) / 2 + (q.gap ?? 10);
  const free = (p: Pt) =>
    placed.every(
      (q) =>
        Math.abs(p[0] - q.at[0]) >= dx(q) - 0.5 ||
        Math.abs(p[1] - q.at[1]) >= dy(q) - 0.5
    );
  for (const { i } of order) {
    const want = wanted[i];
    let at = want;
    if (!free(want)) {
      const xs = [want[0], m + w / 2, frameW - m - w / 2];
      const ys = [want[1], m + h / 2, frameH - m - h / 2];
      for (const q of placed) {
        xs.push(q.at[0] - dx(q), q.at[0] + dx(q));
        ys.push(q.at[1] - dy(q), q.at[1] + dy(q));
      }
      let best = Infinity;
      for (const x of xs)
        for (const y of ys) {
          const p = keepInside([x, y], w, h, frameW, frameH, m);
          const d = Math.hypot(p[0] - want[0], (p[1] - want[1]) * 1.5);
          if (d < best && free(p)) {
            best = d;
            at = p;
          }
        }
    }
    out[i] = at;
    placed.push({ at, w, h });
  }
  return out;
};

/** Cadre étroit (petit écran) : cartes resserrées et commandes en icônes. */
export const compactFrame = (frameW: number) => frameW < 900;

/** Taille d'une carte de quartier : trois tiennent sur une ligne même en cadre étroit. */
export const CARD_H = 60;
export const cardWidth = (frameW: number) => (compactFrame(frameW) ? 206 : 238);

/**
 * Les cartes des quartiers dans le cadre, dans l'ordre de DISTRICT_SPOTS :
 * sur leur bâtiment si possible, sans se recouvrir ni recouvrir un site de
 * production (pastille et nom, environ 150 × 28 à droite du repère).
 */
export const placeDistrictCards = (c: Camera, frameW: number, frameH: number) =>
  spreadCards(
    DISTRICT_SPOTS.map((s) => toFrame(c, s.card)),
    cardWidth(frameW),
    CARD_H,
    frameW,
    frameH,
    siteBoxes(c)
  );

/** Les sites de production tels qu'ils occupent le cadre : pastille et nom, environ 150 × 28 à droite du repère. */
export const siteBoxes = (c: Camera): Box[] =>
  PRODUCTION_SITES.map((s) => {
    const [x, y] = toFrame(c, s.at);
    return { at: [x + 61, y] as Pt, w: 150, h: 28, gap: 0 };
  });

/** Hauteur d'une bulle d'activité ; sa largeur dépend de ses textes (`bubbleWidth`). */
export const BUBBLE_H = 44;

/**
 * Largeur estimée d'une bulle : pastille, la plus longue de ses deux lignes,
 * marges. Mesuré en Inter : 6,5 à 7,3 px par caractère pour le titre
 * (12,5 px, demi-gras), 4,6 à 5,7 pour la ligne du dessous (11 px).
 */
export const bubbleWidth = (text: string, sub: string) =>
  Math.round(
    Math.min(
      260,
      Math.max(140, 66 + Math.max(text.length * 7.4, sub.length * 5.8))
    )
  );

/**
 * Les bulles d'activité : chacune juste au-dessus de son bâtiment (`anchor`,
 * dans le cadre) si la place est libre, sinon à la place libre la plus proche
 * — jamais sur une carte, un site ou une autre bulle. `moved` : la bulle a dû
 * s'écarter (sa tige ne pointerait plus son bâtiment).
 */
export const placeBubbles = (
  items: { anchor: Pt; w: number }[],
  frameW: number,
  frameH: number,
  obstacles: Box[]
): { at: Pt; moved: boolean }[] => {
  const placed: Box[] = [...obstacles];
  return items.map(({ anchor, w }) => {
    const want: Pt = [anchor[0], anchor[1] - 18 - BUBBLE_H / 2];
    const [at] = spreadCards([want], w, BUBBLE_H, frameW, frameH, placed);
    placed.push({ at, w, h: BUBBLE_H, gap: 6 });
    return { at, moved: Math.hypot(at[0] - want[0], at[1] - want[1]) > 1 };
  });
};

// ── Les chiffres des cartes ──────────────────────────────────────────────────

/** « 64 », « 1 234 » → nombre ; « — » (lecture impossible) → null. */
export const readCount = (v?: string | number | null): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (!v) return null;
  const n = Number(v.replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Un chiffre de la fiche d'une rubrique, par son libellé. */
export const statOf = (
  data: VillageData | null,
  id: SectionId,
  label: string
) => data?.sections[id]?.stats.find((s) => s.label === label);

/** La ligne sous le nom d'un quartier : son chiffre le plus parlant. */
export const districtLine = (
  d: DistrictId,
  data: VillageData | null,
  loading: boolean
): string => {
  if (!data) return loading ? 'Chargement…' : 'Chiffres indisponibles';
  const say = (n: number | null, one: string, many?: string) =>
    n === null ? 'Chiffres indisponibles' : plural(n, one, many);
  const stat = (id: SectionId, label: string) =>
    readCount(statOf(data, id, label)?.value);
  switch (d) {
    case 'clients':
      return say(stat('clients', 'Clients'), 'client');
    case 'projets':
      return say(
        readCount(data.kpis.projectsInProgress),
        'projet en cours',
        'projets en cours'
      );
    case 'boutique':
      return say(
        stat('boutique', 'Produits actifs'),
        'produit actif',
        'produits actifs'
      );
    case 'production':
      return say(stat('producteurs', 'Producteurs'), 'producteur');
    case 'finance':
      return say(
        stat('finance', 'Factures à régler'),
        'facture à régler',
        'factures à régler'
      );
    default:
      return say(
        stat('tickets', 'Ouverts'),
        'ticket ouvert',
        'tickets ouverts'
      );
  }
};

/** Chemin SVG d'une ligne de points de l'image, dans le cadre. */
export const framePath = (c: Camera, pts: Pt[]) =>
  pts
    .map((p, i) => {
      const [x, y] = toFrame(c, p);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
