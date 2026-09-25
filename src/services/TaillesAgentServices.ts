import ApiService from './ApiService';

/**
 * Agent Tailles — passe en revue les tailles proposées sur chaque produit
 * (Strapi, routes admin). Backend : peg_strapi `src/services/tailles.service.ts`.
 */

export type TaillesReviewStatus =
  | 'applied' | 'proposed' | 'accepted' | 'rejected' | 'reverted' | 'stale' | 'blocked' | 'flagged';

export type TaillesKind = 'ordre' | 'doublon' | 'ajustement' | 'signalement';

export type TaillesSizeRef = { documentId: string; name: string };

export type TaillesAdjustment = {
  action: 'retirer' | 'ajouter';
  taille: string;
  raison?: string;
  /** Extrait de la fiche qui annonce la taille ajoutée. */
  preuve?: string;
  applied: boolean;
  /** Motif du refus par un garde-fou. */
  motif?: string;
};

export type TaillesReview = {
  id: number;
  createdAt: string | null;
  documentId: string;
  label: string;
  kind: TaillesKind;
  status: TaillesReviewStatus;
  before: TaillesSizeRef[] | null;
  after: TaillesSizeRef[] | null;
  details: {
    ajustements?: TaillesAdjustment[];
    doublons?: { taille: string; gardee: string }[];
    note?: string;
  } | null;
  source: string;
  model: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type TaillesRunSummary = {
  source: 'nuit' | 'manuel';
  produits: number;
  examines: number;
  appliques: number;
  propositions: number;
  signalements: number;
  bloques: number;
  erreurs: number;
  dureeSecondes: number;
  /** Motif d'arrêt anticipé (budget du jour atteint, quota). */
  arret?: string;
};

export type TaillesStatus = {
  enabled: boolean;
  autoApply: boolean;
  lastRunAt: string | null;
  lastRunSummary: TaillesRunSummary | null;
  /** Budget IA du jour, partagé avec le relecteur (même modèle dédié). */
  tokensToday: number;
  tokensBudget: number;
  running: boolean;
  queued: number;
  groqConfigured: boolean;
  model: string;
  byStatus: Partial<Record<TaillesReviewStatus, number>>;
  coverage: { produits: number; avecTailles: number; examines: number };
};

type ReviewResponse = { result: boolean; review?: TaillesReview; message?: string };

export const apiGetTaillesStatus = () =>
  ApiService.fetchData<{ result: boolean; status: TaillesStatus }>({ url: '/tailles/status', method: 'get' });

export const apiUpdateTaillesSettings = (data: { enabled?: boolean; autoApply?: boolean }) =>
  ApiService.fetchData<{ result: boolean }>({ url: '/tailles/settings', method: 'put', data });

export const apiGetTaillesReviews = (status: TaillesReviewStatus[] = [], limit = 300) =>
  ApiService.fetchData<{ result: boolean; reviews: TaillesReview[] }>({
    url: '/tailles/reviews',
    method: 'get',
    params: { status: status.join(','), limit },
  });

export const apiAcceptTaillesReview = (id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/tailles/reviews/${id}/accept`, method: 'post' });

export const apiRejectTaillesReview = (id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/tailles/reviews/${id}/reject`, method: 'post' });

export const apiRevertTaillesReview = (id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/tailles/reviews/${id}/revert`, method: 'post' });

/** Sans `documentId` : passe complète en tâche de fond. */
export const apiRunTailles = (documentId?: string) =>
  ApiService.fetchData<{ result: boolean; started: boolean; reason?: string }>({
    url: '/tailles/run',
    method: 'post',
    data: documentId ? { documentId } : {},
  });
