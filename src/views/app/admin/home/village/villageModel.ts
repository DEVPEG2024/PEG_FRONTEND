// Ce que le village affiche pour chaque rubrique : pastille, filtres, phrase,
// chiffres et lignes « En ce moment ». Rempli par useVillageData à partir des
// vraies données ; une rubrique dont la lecture échoue reste affichée, sans
// pastille, avec « Données indisponibles ».
import type { VillageFilter } from './VillageMap';
import type { FlowId } from './villageFlows';
import type { SectionId } from './villageScene';

export const TONE = {
  violet: '#6d5dfc',
  orange: '#f97316',
  green: '#16a34a',
  red: '#ef4444',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  grey: '#9ca3af',
} as const;

export interface SectionItem {
  title: string;
  meta: string;
  dot: string;
  /** Projet à ouvrir dans la fiche (documentId). */
  projectId?: string;
  /** Page de l'application à ouvrir. */
  to?: string;
}

/** Chiffres suivis d'un jour sur l'autre (photo quotidienne côté serveur). */
export type TrendKey =
  | 'projectsInProgress'
  | 'projectsLate'
  | 'batToValidate'
  | 'overdueInvoices'
  | 'unpaidTotal'
  | 'ticketsOpen'
  | 'quotesRequested'
  | 'customers'
  | 'leadsToCall'
  | 'ordersPending'
  | 'productsActive'
  | 'commissionsPending';

/** Évolution d'un chiffre depuis la photo de comparaison. */
export interface Trend {
  delta: number;
  /** « +4 », « −2 » (montants formatés), « = » si stable. */
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  /** « depuis hier », « en 7 jours », « depuis le 14 octobre ». */
  since: string;
}

/** « ▲ +4 en 7 jours », « ▼ −2 depuis hier », « Stable depuis hier ». */
export const trendText = (t: Trend) =>
  t.delta === 0
    ? `Stable ${t.since}`
    : `${t.delta > 0 ? '▲' : '▼'} ${t.text} ${t.since}`;

export interface SectionStat {
  label: string;
  value: string;
  trend?: Trend;
}

/** Activité des 30 derniers jours, comparée à la moyenne des 3 périodes précédentes. */
export interface ActivityInfo {
  /** 0 = en dessous, 1 = dans la moyenne, 2 = en hausse, 3 = exceptionnel. */
  level: 0 | 1 | 2 | 3;
  label: string;
  /** « 42 commandes payées en 30 jours (moyenne 28) ». */
  text: string;
}

export interface SectionData {
  badge: string | null;
  tone: string;
  tags: VillageFilter[];
  /** Ligne courte sous le titre de la fiche et dans la vue liste. */
  chip: string;
  lead: string;
  stats: SectionStat[];
  items: SectionItem[];
  /** Vrai si la rubrique demande une action (compte « À traiter » du quartier). */
  attention: boolean;
  /**
   * Vrai problème (projet en retard, facture impayée depuis plus de 30 jours,
   * ticket ou demande de devis sans réponse depuis 48 h) : drapeau rouge sur le
   * bâtiment. La phrase s'affiche en tête de fiche.
   */
  alert: string | null;
  /** Activité du mois (bâtiments qui grandissent) ; null si non suivie. */
  activity: ActivityInfo | null;
}

export interface ProjectStep {
  title: string;
  sub: string;
  state: 'done' | 'current' | 'late' | 'todo';
}

export interface ProjectCard {
  documentId: string;
  name: string;
  customer: string;
  chip: string;
  chipTone: 'bat' | 'late' | 'production' | 'paid' | 'waiting';
  detail: string;
  steps: ProjectStep[];
  dateLabel: string;
  date: string;
  late: boolean;
  imageUrl: string | null;
}

/** Un point d'une petite courbe : jour AAAA-MM-JJ et valeur (null = pas de photo ce jour-là). */
export interface SeriesPoint {
  day: string;
  value: number | null;
}

export interface VillageKpis {
  projectsInProgress: number | null;
  batToValidate: number | null;
  nextDelivery: string | null;
  /** « aujourd’hui », « demain », « dans 3 jours » ; null sans livraison prévue. */
  nextDeliveryIn: string | null;
  overdueInvoices: number | null;
  trends: Partial<
    Record<'projectsInProgress' | 'batToValidate' | 'overdueInvoices', Trend>
  >;
  /**
   * Petites courbes : les 7 derniers jours (aujourd'hui = chiffre en direct)
   * pour trois chiffres clés ; les 7 prochains jours pour les livraisons.
   */
  series: Partial<
    Record<
      'projectsInProgress' | 'batToValidate' | 'overdueInvoices' | 'deliveries',
      SeriesPoint[]
    >
  >;
}

/** Une livraison du jour (fiche « Ma journée »). */
export interface DayDelivery {
  documentId: string;
  name: string;
  customer: string;
}

/** Détails animés liés aux données du jour. */
export interface VillageLife {
  /** Camions de livraison sur la route : un par livraison du jour (3 au plus). */
  vans: number;
}

export interface VillageData {
  kpis: VillageKpis;
  sections: Record<SectionId, SectionData>;
  /** Projets mis en avant (le plus urgent d'abord). */
  projects: ProjectCard[];
  life: VillageLife;
  /** Projets actifs dont la livraison est prévue aujourd'hui (fiche « Ma journée »), les premiers. */
  todayDeliveries: DayDelivery[];
  /** Leur nombre total (la liste peut en montrer moins). */
  todayDeliveryCount: number;
  /**
   * Volumes des flux d'activité (rues en fibres optiques) : commandes payées
   * sur 30 jours, livraisons prévues sur 7 jours, factures à encaisser.
   * null = lecture manquante (aucun point, jamais un faux 0).
   */
  flowCounts: Record<FlowId, number | null>;
}

/** La rubrique répond-elle au filtre ? « Urgent » = rubrique en alerte. */
export const matchesFilter = (
  d: { tags: VillageFilter[]; alert: string | null },
  filter: VillageFilter
) =>
  filter === 'tout' ||
  (filter === 'urgent' ? !!d.alert : d.tags.includes(filter));

/** Rubrique sans données (chargement ou lecture impossible). */
export const emptySection = (chip: string): SectionData => ({
  badge: null,
  tone: TONE.violet,
  tags: [],
  chip,
  lead: chip,
  stats: [],
  items: [],
  attention: false,
  alert: null,
  activity: null,
});

/** Pluriel français simple : plural(3, 'devis', 'devis'), plural(1, 'ticket'). */
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n > 1 ? many : one}`;
