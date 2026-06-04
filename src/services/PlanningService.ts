/**
 * Service Planning — persistance des métadonnées de planification (Phase 1).
 *
 * Appelle PEG_BACKEND (Express) via le proxy same-origin `/peg-api` en prod
 * (pas de CORS) et `http://localhost:3000` en dev — même pattern que
 * NotificationService. Strapi reste la source de vérité des projets ; ces
 * endpoints ne stockent que des overrides keyés par documentId Strapi.
 *
 * Toutes les fonctions sont tolérantes : si le backend Planning n'est pas
 * déployé, l'appelant retombe sur le calcul 100 % client (mode POC).
 */

const BASE = import.meta.env.DEV ? 'http://localhost:3000' : '/peg-api';

export type PlanningSettings = {
  id: string;
  horizon_weeks: number;
  tight_margin_days: number;
  default_workload_days: number;
  days_per_task: number;
  priority_weights: Record<string, number>;
  updated_at: string;
};

export type PlanningEstimate = {
  project_document_id: string;
  manual_days: number | null;
  note: string;
  updated_by: string;
  updated_at: string;
};

export type ProducerCapacity = {
  producer_document_id: string;
  daily_capacity_days: number;
  weekly_off_days: number[];
  unavailable_dates: string[];
  note: string;
  updated_at: string;
};

export type PlanningRunSummary = {
  id: number;
  label: string;
  horizon_weeks: number;
  generated_by: string;
  counts: { late: number; tight: number; ok: number; total: number };
  created_at: string;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/planning${path}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`planning GET ${path} → ${res.status}`);
  return res.json();
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/planning${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`planning ${method} ${path} → ${res.status}`);
  return res.json();
}

// --- Settings --------------------------------------------------------------
export const apiGetPlanningSettings = () =>
  getJson<{ settings: PlanningSettings }>('/settings').then((r) => r.settings);

export const apiUpdatePlanningSettings = (data: Partial<{
  horizonWeeks: number;
  tightMarginDays: number;
  defaultWorkloadDays: number;
  daysPerTask: number;
  priorityWeights: Record<string, number>;
}>) => sendJson<{ settings: PlanningSettings }>('PUT', '/settings', data).then((r) => r.settings);

// --- Estimates (override manuel de durée) ----------------------------------
export const apiGetPlanningEstimates = () =>
  getJson<{ estimates: PlanningEstimate[] }>('/estimates').then((r) => r.estimates);

export const apiSetPlanningEstimate = (
  projectDocumentId: string,
  data: { manualDays: number | null; note?: string; updatedBy?: string }
) => sendJson<{ estimate: PlanningEstimate }>('PUT', `/estimates/${encodeURIComponent(projectDocumentId)}`, data)
  .then((r) => r.estimate);

export const apiDeletePlanningEstimate = (projectDocumentId: string) =>
  sendJson<{ ok: boolean }>('DELETE', `/estimates/${encodeURIComponent(projectDocumentId)}`);

// --- Producer capacities ---------------------------------------------------
export const apiGetProducerCapacities = () =>
  getJson<{ capacities: ProducerCapacity[] }>('/producers/capacities').then((r) => r.capacities);

export const apiSetProducerCapacity = (
  producerDocumentId: string,
  data: { dailyCapacityDays: number; weeklyOffDays?: number[]; unavailableDates?: string[]; note?: string }
) => sendJson<{ capacity: ProducerCapacity }>('PUT', `/producers/${encodeURIComponent(producerDocumentId)}/capacity`, data)
  .then((r) => r.capacity);

// --- Runs (snapshots / historique) -----------------------------------------
export const apiCreatePlanningRun = (data: {
  label?: string;
  horizonWeeks?: number;
  generatedBy?: string;
  counts?: unknown;
  snapshot?: unknown;
  aiSummary?: string;
}) => sendJson<{ run: PlanningRunSummary }>('POST', '/runs', data).then((r) => r.run);

export const apiGetPlanningRuns = (limit = 20) =>
  getJson<{ runs: PlanningRunSummary[] }>(`/runs?limit=${limit}`).then((r) => r.runs);

export const apiDeletePlanningRun = (id: number) =>
  sendJson<{ ok: boolean }>('DELETE', `/runs/${id}`);

/**
 * Charge les overrides manuels et renvoie une map projectDocumentId → jours.
 * Tolérant : renvoie une map vide si le backend Planning est indisponible.
 */
export async function loadManualOverrides(): Promise<Record<string, number>> {
  try {
    const estimates = await apiGetPlanningEstimates();
    const map: Record<string, number> = {};
    for (const e of estimates) {
      if (e.manual_days != null) map[e.project_document_id] = e.manual_days;
    }
    return map;
  } catch {
    return {};
  }
}

/** Forme de capacité consommée par le moteur (computeProducerLoads). */
export type CapacityConfig = {
  dailyCapacityDays: number;
  weeklyOffDays?: number[];
  unavailableDates?: string[];
};

/**
 * Charge les capacités producteurs et renvoie une map producerDocumentId → config.
 * Tolérant : map vide si le backend est indisponible.
 */
export async function loadProducerCapacities(): Promise<Record<string, CapacityConfig>> {
  try {
    const capacities = await apiGetProducerCapacities();
    const map: Record<string, CapacityConfig> = {};
    for (const c of capacities) {
      map[c.producer_document_id] = {
        dailyCapacityDays: c.daily_capacity_days,
        weeklyOffDays: c.weekly_off_days,
        unavailableDates: (c.unavailable_dates || []).map((d) => String(d).slice(0, 10)),
      };
    }
    return map;
  } catch {
    return {};
  }
}
