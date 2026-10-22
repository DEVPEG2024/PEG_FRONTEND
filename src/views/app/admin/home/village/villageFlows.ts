// Échanges entre les bâtiments de la ville : des points lumineux ou des
// documents circulent sur des chemins en pointillés, au rythme des vrais
// chiffres — commandes (Boutique → Projets), demandes de devis (Clients →
// Projets), dossiers en production (Projets → Production), factures (Projets
// → Finance), tickets (Clients → Assistance). Les livraisons, elles, roulent
// en camion (un par livraison du jour). Fonctions pures, testées.
import { exchangeCurve, type DistrictId, type Exchange } from './villageScene';

export type FlowId =
  | 'commandes'
  | 'demandes'
  | 'production'
  | 'livraisons'
  | 'factures'
  | 'tickets';

export interface FlowDef {
  id: FlowId;
  /** « Commandes » */
  label: string;
  /** Ce que compte le chiffre : « payées sur 30 jours ». */
  detail: string;
  /** Même chose en bref, après le nombre : « commandes (30 j) ». */
  short: string;
  /** Chemin entre deux bâtiments ; absent = pas de chemin (camions). */
  exchange?: Exchange & {
    /** Point lumineux ou document. */
    token: 'dot' | 'doc';
  };
}

export const FLOW_DEFS: FlowDef[] = [
  {
    id: 'commandes',
    label: 'Commandes',
    detail: 'payées sur 30 jours',
    short: 'commandes (30 j)',
    exchange: { from: 'boutique', to: 'projets', arc: 60, token: 'dot' },
  },
  {
    id: 'demandes',
    label: 'Demandes de devis',
    detail: 'à préparer',
    short: 'demandes de devis',
    exchange: { from: 'clients', to: 'projets', arc: 60, token: 'dot' },
  },
  {
    id: 'production',
    label: 'En production',
    detail: 'projets en cours',
    short: 'projets en cours',
    exchange: { from: 'projets', to: 'production', arc: 60, token: 'doc' },
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    detail: 'prévues sur 7 jours',
    short: 'livraisons (7 j)',
  },
  {
    id: 'factures',
    label: 'Factures',
    detail: 'à encaisser',
    short: 'factures à encaisser',
    exchange: { from: 'projets', to: 'finance', arc: 46, token: 'doc' },
  },
  {
    id: 'tickets',
    label: 'Tickets',
    detail: 'ouverts',
    short: 'tickets ouverts',
    exchange: { from: 'clients', to: 'assistance', arc: -150, token: 'dot' },
  },
];

/** Jetons sur un chemin : racine du volume ; 6 points ou 3 documents au plus. */
export const flowDots = (
  count: number | null | undefined,
  token: 'dot' | 'doc' = 'dot'
) =>
  !count || count <= 0
    ? 0
    : Math.min(
        token === 'doc' ? 3 : 6,
        Math.max(1, Math.round(Math.sqrt(count) * 1.2))
      );

/** Vitesse des jetons (pixels de carte par seconde). */
export const FLOW_SPEED = 46;

export interface VillageFlow extends FlowDef {
  /** null = chiffre illisible : ni jeton ni nombre (jamais un faux 0). */
  count: number | null;
  /** Jetons sur le chemin (0 sans chemin ou sans volume). */
  dots: number;
  d: string;
  length: number;
  /** Durée d'un trajet (s). */
  duration: number;
}

export const villageFlows = (
  counts: Partial<Record<FlowId, number | null>>
): VillageFlow[] =>
  FLOW_DEFS.map((f) => {
    const raw = counts[f.id];
    const count = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    if (!f.exchange)
      return { ...f, count, dots: 0, d: '', length: 0, duration: 0 };
    const { d, length } = exchangeCurve(f.exchange);
    return {
      ...f,
      count,
      dots: flowDots(count, f.exchange.token),
      d,
      length,
      duration: Math.max(2.8, length / FLOW_SPEED),
    };
  });

/** Échanges qui touchent un quartier (aperçu au survol, fiche). */
export const flowsOf = (flows: VillageFlow[], id: DistrictId) =>
  flows.filter(
    (f) => f.exchange && (f.exchange.from === id || f.exchange.to === id)
  );

const KEY = 'peg:villageAnimations';

/** Animations de la ville affichées sur cet appareil (activées par défaut). */
export const readAnimationsOn = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const writeAnimationsOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // stockage indisponible : le choix vaut pour la session
  }
};
