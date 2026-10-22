// « PEG DISTRICTS » — le réseau des échanges entre les bâtiments (22/10/2026,
// demandes : « plus de connexion », puis « plus de lien entre les
// bâtiments »). Chaque lien est un vrai échange de l'activité, avec son vrai
// chiffre : les six de la ville dessinée (commandes, demandes de devis,
// production, livraisons, factures, tickets) et ceux que seules les rubriques
// connaissent (devis envoyés, BAT à valider, planning des ateliers,
// virements déclarés, commandes du jour, conversations de l'assistant IA).
// Un chiffre illisible ne devient jamais un faux 0 : le lien reste pâle.
//
// Ne dépend ni de React ni du navigateur : il est testé tel quel.

import { readCount, statOf } from './districtsScene';
import type { VillageData } from './villageModel';
import type { SectionId } from './villageScene';

export interface NetworkLink {
  id: string;
  /** « Devis envoyés » */
  label: string;
  /** D'où vient et où va l'échange, en mots (légende). */
  route: string;
  /** Ce que compte le chiffre (infobulle de la légende). */
  detail: string;
  /** Pôles de départ et d'arrivée (ROOFS). */
  from: SectionId;
  to: SectionId;
  /** Point lumineux ou document. */
  token: 'dot' | 'doc';
  color: string;
  /** < 1 : courbe plus basse, pour l'échange retour entre deux mêmes bâtiments. */
  bend: number;
  count: (data: VillageData) => number | null;
}

const stat = (id: SectionId, label: string) => (data: VillageData) =>
  readCount(statOf(data, id, label)?.value);

/**
 * Les liens, regroupés par famille de couleur (une famille = un même
 * domaine : commandes, devis, ateliers, argent, assistance).
 */
export const NETWORK: NetworkLink[] = [
  {
    id: 'commandes',
    label: 'Commandes',
    route: 'Boutique → Projets',
    detail: 'payées sur 30 jours',
    from: 'boutique',
    to: 'projets',
    token: 'dot',
    color: '#8b5cf6',
    bend: 1,
    count: (d) => d.flowCounts.commandes,
  },
  {
    id: 'commandes-jour',
    label: 'Commandes du jour',
    route: 'Clients → Boutique',
    detail: 'passées aujourd’hui',
    from: 'clients',
    to: 'boutique',
    token: 'dot',
    color: '#6366f1',
    bend: 1,
    count: stat('boutique', 'Aujourd’hui'),
  },
  {
    id: 'demandes',
    label: 'Demandes de devis',
    route: 'Clients → Devis',
    detail: 'à préparer',
    from: 'clients',
    to: 'devis',
    token: 'dot',
    color: '#14b8a6',
    bend: 1,
    count: (d) => d.flowCounts.demandes,
  },
  {
    id: 'devis-envoyes',
    label: 'Devis envoyés',
    route: 'Devis → Clients',
    detail: 'en attente de la réponse du client',
    from: 'devis',
    to: 'clients',
    token: 'doc',
    color: '#06b6d4',
    bend: 0.55,
    count: stat('devis', 'En attente du client'),
  },
  {
    id: 'production',
    label: 'En production',
    route: 'Projets → Producteurs',
    detail: 'projets en cours',
    from: 'projets',
    to: 'producteurs',
    token: 'doc',
    color: '#f97316',
    bend: 1,
    count: (d) => d.flowCounts.production,
  },
  {
    id: 'planning',
    label: 'Planning des ateliers',
    route: 'Planning → Producteurs',
    detail: 'producteurs occupés',
    from: 'planning',
    to: 'producteurs',
    token: 'dot',
    color: '#84cc16',
    bend: 1,
    count: stat('planning', 'Producteurs occupés'),
  },
  {
    id: 'bat',
    label: 'BAT à valider',
    route: 'Projets → Clients',
    detail: 'en attente du client',
    from: 'projets',
    to: 'clients',
    token: 'doc',
    color: '#d946ef',
    bend: 1,
    count: stat('projets', 'BAT à valider'),
  },
  {
    id: 'livraisons',
    label: 'Livraisons',
    route: 'Ateliers → Clients, en camion',
    detail: 'prévues sur 7 jours',
    from: 'fournisseurs',
    to: 'clients',
    token: 'doc',
    color: '#0ea5e9',
    bend: 1,
    count: (d) => d.flowCounts.livraisons,
  },
  {
    id: 'factures',
    label: 'Factures',
    route: 'Projets → Finance',
    detail: 'à encaisser',
    from: 'projets',
    to: 'finance',
    token: 'doc',
    color: '#f59e0b',
    bend: 1,
    count: (d) => d.flowCounts.factures,
  },
  {
    id: 'virements',
    label: 'Virements déclarés',
    route: 'Clients → Finance',
    detail: 'à confirmer',
    from: 'clients',
    to: 'finance',
    token: 'dot',
    color: '#10b981',
    bend: 0.75,
    count: stat('finance', 'Virements à confirmer'),
  },
  {
    id: 'tickets',
    label: 'Tickets',
    route: 'Clients → Tickets',
    detail: 'ouverts',
    from: 'clients',
    to: 'tickets',
    token: 'dot',
    color: '#f43f5e',
    bend: 1,
    count: (d) => d.flowCounts.tickets,
  },
  {
    id: 'ia',
    label: 'Conversations IA',
    route: 'Assistant IA → Clients',
    detail: 'aujourd’hui',
    from: 'ia',
    to: 'clients',
    token: 'dot',
    color: '#ec4899',
    bend: 0.55,
    count: stat('ia', 'Conversations aujourd’hui'),
  },
];

/** Le chiffre d'un lien ; données absentes ou illisibles : null (jamais un faux 0). */
export const linkCount = (link: NetworkLink, data: VillageData | null) => {
  if (!data) return null;
  const n = link.count(data);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
