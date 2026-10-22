// Échanges entre les bâtiments de la ville : des points lumineux ou des
// documents circulent par les rues, d'une porte à l'autre, au rythme des
// vrais chiffres — commandes (Boutique → Projets), demandes de devis
// (Clients → Devis), projets en cours (Projets → Producteurs), factures
// (Projets → Finance), tickets (Clients → Tickets). Les livraisons, elles,
// roulent en camion (un par livraison du jour). Fonctions pures, testées.
import {
  routeLength,
  routePath,
  streetRoute,
  type SectionId,
} from './villageScene';

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
  exchange?: {
    from: SectionId;
    to: SectionId;
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
    exchange: { from: 'boutique', to: 'projets', token: 'dot' },
  },
  {
    id: 'demandes',
    label: 'Demandes de devis',
    detail: 'à préparer',
    short: 'demandes de devis',
    exchange: { from: 'clients', to: 'devis', token: 'dot' },
  },
  {
    id: 'production',
    label: 'En production',
    detail: 'projets en cours',
    short: 'projets en cours',
    exchange: { from: 'projets', to: 'producteurs', token: 'doc' },
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
    exchange: { from: 'projets', to: 'finance', token: 'doc' },
  },
  {
    id: 'tickets',
    label: 'Tickets',
    detail: 'ouverts',
    short: 'tickets ouverts',
    exchange: { from: 'clients', to: 'tickets', token: 'dot' },
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
  /** Trajet par les rues (points au sol), son chemin SVG et sa longueur. */
  route: [number, number][];
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
      return {
        ...f,
        count,
        dots: 0,
        route: [],
        d: '',
        length: 0,
        duration: 0,
      };
    const route = streetRoute(f.exchange.from, f.exchange.to);
    const length = routeLength(route);
    return {
      ...f,
      count,
      dots: flowDots(count, f.exchange.token),
      route,
      d: routePath(route, 2),
      length,
      duration: Math.max(2.8, length / FLOW_SPEED),
    };
  });

/** Échanges qui partent d'un bâtiment ou y arrivent (aperçu au survol). */
export const flowsOf = (flows: VillageFlow[], id: SectionId) =>
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
