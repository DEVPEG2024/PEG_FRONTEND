// « PEG DISTRICTS » (accueil admin, 22/10/2026) : la ville est un rendu 3D —
// une image —, et tout ce qui est interactif est posé par-dessus : une carte
// par quartier, les trois sites de production numérotés, la ligne de
// production lumineuse. Ce module place ces repères en pixels de l'image et
// calcule le cadrage (remplir le cadre, zoom, déplacement).
//
// Ne dépend ni de React ni du navigateur : il est testé tel quel.

import { plural, type VillageData } from './villageModel';
import type { DistrictId, SectionId } from './villageScene';

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
