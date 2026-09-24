import ApiService from './ApiService';

/**
 * Relecteur PEG — agent de relecture des fiches produit (Strapi, routes admin).
 * Backend : peg_strapi `src/services/relecteur.service.ts`.
 */

export type RelecteurReviewStatus =
  | 'applied' | 'proposed' | 'accepted' | 'rejected' | 'reverted' | 'stale' | 'blocked' | 'flagged';

export type RelecteurEditOutcome = {
  avant: string;
  apres: string;
  raison?: string;
  applied: boolean;
  motif?: string;
};

export type RelecteurReview = {
  id: number;
  createdAt: string | null;
  documentId: string;
  label: string;
  field: 'name' | 'description';
  kind: 'spelling' | 'style' | 'fact';
  status: RelecteurReviewStatus;
  before: string | null;
  after: string | null;
  details: {
    corrections?: RelecteurEditOutcome[];
    nettoyage?: boolean;
    garde_fou?: string;
    note?: string;
  } | null;
  source: string;
  model: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type RelecteurRunSummary = {
  source: 'nuit' | 'manuel';
  produits: number;
  relus: number;
  appliquees: number;
  propositions: number;
  signalements: number;
  bloquees: number;
  erreurs: number;
  dureeSecondes: number;
};

export type RelecteurStatus = {
  enabled: boolean;
  autoApply: boolean;
  lastRunAt: string | null;
  lastRunSummary: RelecteurRunSummary | null;
  running: boolean;
  queued: number;
  groqConfigured: boolean;
  model: string;
  byStatus: Partial<Record<RelecteurReviewStatus, number>>;
  coverage: { produits: number; sobres: number; visibles: number; visiblesSobres: number };
};

type ReviewResponse = { result: boolean; review?: RelecteurReview; message?: string };

export const apiGetRelecteurStatus = () =>
  ApiService.fetchData<{ result: boolean; status: RelecteurStatus }>({ url: '/relecteur/status', method: 'get' });

export const apiUpdateRelecteurSettings = (data: { enabled?: boolean; autoApply?: boolean }) =>
  ApiService.fetchData<{ result: boolean }>({ url: '/relecteur/settings', method: 'put', data });

export const apiGetRelecteurReviews = (status: RelecteurReviewStatus[] = [], limit = 300) =>
  ApiService.fetchData<{ result: boolean; reviews: RelecteurReview[] }>({
    url: '/relecteur/reviews',
    method: 'get',
    params: { status: status.join(','), limit },
  });

export const apiAcceptRelecteurReview = (id: number, text?: string) =>
  ApiService.fetchData<ReviewResponse>({ url: `/relecteur/reviews/${id}/accept`, method: 'post', data: text ? { text } : {} });

export const apiRejectRelecteurReview = (id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/relecteur/reviews/${id}/reject`, method: 'post' });

export const apiRevertRelecteurReview = (id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/relecteur/reviews/${id}/revert`, method: 'post' });

/** Sans `documentId` : passe complète en tâche de fond. */
export const apiRunRelecteur = (documentId?: string) =>
  ApiService.fetchData<{ result: boolean; started: boolean; reason?: string }>({
    url: '/relecteur/run',
    method: 'post',
    data: documentId ? { documentId } : {},
  });
