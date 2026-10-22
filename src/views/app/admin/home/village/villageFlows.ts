// Flux d'activité : les rues deviennent des fibres optiques et des points de
// lumière suivent le parcours d'une commande, sur l'avenue de l'Atelier —
// commande (Boutique → Atelier), livraison (Atelier → sortie de la ville, la
// route des camionnettes), facture (Atelier → Finance). Plus PEG tourne, plus
// ça circule : le nombre de points suit les vrais chiffres. Fonctions pures,
// testées.
import { toMap } from './villageScene';

export type FlowId = 'commandes' | 'livraisons' | 'factures';

export interface FlowDef {
  id: FlowId;
  /** « Commandes » */
  label: string;
  /** Ce que compte le chiffre : « payées sur 30 jours ». */
  detail: string;
  /** Même chose en bref, après le nombre : « commandes (30 j) ». */
  short: string;
  color: string;
  /**
   * Trajet le long des rues, en coordonnées de case (u, v) : les rues
   * suivent les demi-entiers ; ±0,05 = la voie de droite ou de gauche.
   */
  route: [number, number][];
}

export const FLOW_DEFS: FlowDef[] = [
  {
    id: 'commandes',
    label: 'Commandes',
    detail: 'payées sur 30 jours',
    short: 'commandes (30 j)',
    color: '#8b5cf6',
    // Porte avant de la Boutique → angle de l'avenue → porte de l'Atelier.
    route: [
      [1, 3.5],
      [1.45, 3.5],
      [1.45, 2],
    ],
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    detail: 'prévues sur 7 jours',
    short: 'livraisons (7 j)',
    color: '#0ea5e9',
    // Atelier → bas de l'avenue : la livraison quitte la ville.
    route: [
      [1.55, 2],
      [1.55, 3.5],
    ],
  },
  {
    id: 'factures',
    label: 'Factures',
    detail: 'à encaisser',
    short: 'factures à encaisser',
    color: '#16a34a',
    // Atelier → carrefour → porte de la Finance.
    route: [
      [1.55, 2],
      [1.55, 2.45],
      [2, 2.45],
    ],
  },
];

/** Points de lumière sur un trajet : racine du volume, de 1 à 9 (0 = rien). */
export const flowDots = (count: number | null | undefined) =>
  !count || count <= 0
    ? 0
    : Math.min(9, Math.max(1, Math.round(Math.sqrt(count) * 1.5)));

/** Vitesse des points (pixels de carte par seconde). */
export const FLOW_SPEED = 42;

/** Trajet en pixels de carte : chemin SVG et longueur. */
export const flowPath = (route: [number, number][]) => {
  const pts = route.map(([u, v]) => toMap(u, v));
  const d = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ');
  const length = pts
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]),
      0
    );
  return { d, length };
};

export interface VillageFlow extends FlowDef {
  /** null = chiffre illisible : ni points, ni nombre (jamais un faux 0). */
  count: number | null;
  dots: number;
  d: string;
  length: number;
  /** Durée d'un trajet (s). */
  duration: number;
}

const KEY = 'peg:villageFlows';

/** Flux affichés sur cet appareil (activés par défaut). */
export const readFlowsOn = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const writeFlowsOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // stockage indisponible : le choix vaut pour la session
  }
};

export const villageFlows = (
  counts: Partial<Record<FlowId, number | null>>
): VillageFlow[] =>
  FLOW_DEFS.map((f) => {
    const raw = counts[f.id];
    const count = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    const { d, length } = flowPath(f.route);
    return {
      ...f,
      count,
      dots: flowDots(count),
      d,
      length,
      duration: Math.max(2.5, length / FLOW_SPEED),
    };
  });
