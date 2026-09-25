import ApiService from './ApiService';

/**
 * Agents IA de fond (Strapi, routes admin `/agents/:agent/*`) :
 *   fichiers — Contrôle des fichiers clients
 *   premium  — Offres personnalisées des clients Premium
 *   tarifs   — Audit des prix du catalogue
 * Backend : peg_strapi `src/services/agents/`.
 */

export type AgentId = 'fichiers' | 'premium' | 'tarifs';

export type AgentStatusValue =
  | 'applied' | 'proposed' | 'accepted' | 'rejected' | 'reverted' | 'stale' | 'blocked' | 'flagged' | 'checked';

export type Severity = 'info' | 'warning' | 'critical';

export type AgentReview = {
  id: number;
  agent: AgentId;
  createdAt: string | null;
  targetUid: string;
  targetId: string;
  label: string;
  kind: string;
  status: AgentStatusValue;
  severity: Severity;
  before: any;
  after: any;
  details: any;
  source: string;
  model: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type AgentRunSummary = {
  source: 'nuit' | 'manuel';
  cibles: number;
  examinees: number;
  appliquees: number;
  propositions: number;
  signalements: number;
  bloquees: number;
  erreurs: number;
  dureeSecondes: number;
  arret?: string;
};

export type AgentStatus = {
  agent: AgentId;
  enabled: boolean;
  autoApply: boolean;
  options: Record<string, any>;
  lastRunAt: string | null;
  lastRunSummary: AgentRunSummary | null;
  usageToday: number;
  dailyBudget: number;
  running: boolean;
  queued: number;
  byStatus: Partial<Record<AgentStatusValue, number>>;
  extra: Record<string, any>;
};

type ReviewResponse = { result: boolean; review?: AgentReview; message?: string };

export const apiGetAgentStatus = (agent: AgentId) =>
  ApiService.fetchData<{ result: boolean; status: AgentStatus }>({ url: `/agents/${agent}/status`, method: 'get' });

export const apiUpdateAgentSettings = (agent: AgentId, data: { enabled?: boolean; autoApply?: boolean; options?: Record<string, any> }) =>
  ApiService.fetchData<{ result: boolean }>({ url: `/agents/${agent}/settings`, method: 'put', data });

export const apiGetAgentReviews = (agent: AgentId, status: AgentStatusValue[] = [], limit = 300) =>
  ApiService.fetchData<{ result: boolean; reviews: AgentReview[] }>({
    url: `/agents/${agent}/reviews`,
    method: 'get',
    params: { status: status.join(','), limit },
  });

export const apiAcceptAgentReview = (agent: AgentId, id: number, input: Record<string, any> = {}) =>
  ApiService.fetchData<ReviewResponse>({ url: `/agents/${agent}/reviews/${id}/accept`, method: 'post', data: input });

export const apiRejectAgentReview = (agent: AgentId, id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/agents/${agent}/reviews/${id}/reject`, method: 'post' });

export const apiRevertAgentReview = (agent: AgentId, id: number) =>
  ApiService.fetchData<ReviewResponse>({ url: `/agents/${agent}/reviews/${id}/revert`, method: 'post' });

export const apiAgentAction = (agent: AgentId, id: number, action: string, input: Record<string, any> = {}) =>
  ApiService.fetchData<ReviewResponse>({ url: `/agents/${agent}/reviews/${id}/actions/${action}`, method: 'post', data: input });

/** Sans `targetId` : passe complète en tâche de fond. */
export const apiRunAgent = (agent: AgentId, targetId?: string) =>
  ApiService.fetchData<{ result: boolean; started: boolean; reason?: string }>({
    url: `/agents/${agent}/run`,
    method: 'post',
    data: targetId ? { targetId } : {},
  });
