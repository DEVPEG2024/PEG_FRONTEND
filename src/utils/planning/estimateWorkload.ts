import { Project } from '@/@types/project';

/**
 * Estimation automatique de la charge de travail d'un projet (en JOURS-HOMME).
 *
 * Le modèle Strapi n'expose PAS de durée estimée (`estimatedHours`) ni
 * d'assignation tâche→producteur. On déduit donc la charge via une cascade de
 * fallbacks, du signal le plus fiable au plus générique. Chaque estimation
 * indique sa source pour rester transparente côté admin.
 *
 * ⚠️ La fenêtre startDate→endDate n'est PAS utilisée comme charge : c'est le
 * temps DISPONIBLE (utilisé pour la marge dans le scheduler), pas l'effort.
 */

export type WorkloadSource = 'producer' | 'tasks' | 'default';

export type WorkloadEstimate = {
  /** Effort estimé en jours ouvrés */
  days: number;
  source: WorkloadSource;
  /** Explication lisible de la provenance de l'estimation */
  label: string;
};

/** Charge par défaut quand aucun signal n'est disponible (jours ouvrés) */
export const DEFAULT_WORKLOAD_DAYS = 3;

/** Charge attribuée à chaque tâche non terminée quand on estime via les tâches */
const DAYS_PER_TASK = 1;

/** Pondération de l'effort selon la priorité du projet */
const PRIORITY_WEIGHT: Record<string, number> = {
  high: 1.3,
  medium: 1,
  low: 0.8,
};

function priorityWeight(priority?: string): number {
  return PRIORITY_WEIGHT[priority ?? 'medium'] ?? 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function estimateWorkload(project: Project): WorkloadEstimate {
  const weight = priorityWeight(project.priority);

  // 1. Signal le plus fiable : délai moyen connu du producteur assigné
  const avg = project.producer?.averageDeliveryDays;
  if (avg && avg > 0) {
    return {
      days: round1(avg * weight),
      source: 'producer',
      label: `basé sur le délai moyen du producteur (${avg} j)`,
    };
  }

  // 2. Sinon, à partir des tâches non terminées du projet
  const tasks = project.tasks ?? [];
  const pendingTasks = tasks.filter((t) => t.state !== 'fulfilled');
  if (pendingTasks.length > 0) {
    return {
      days: round1(pendingTasks.length * DAYS_PER_TASK * weight),
      source: 'tasks',
      label: `basé sur ${pendingTasks.length} tâche(s) à terminer`,
    };
  }

  // 3. Fallback générique
  return {
    days: round1(DEFAULT_WORKLOAD_DAYS * weight),
    source: 'default',
    label: 'estimation par défaut (pas de signal disponible)',
  };
}
