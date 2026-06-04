import { Project } from '@/@types/project';
import { estimateWorkload, WorkloadEstimate } from './estimateWorkload';

/**
 * Moteur d'ordonnancement déterministe (Niveau 2).
 *
 * À partir des projets en cours, calcule :
 *  - la marge (jours dispo − charge estimée) et le niveau de risque ;
 *  - un score d'urgence pour trier la file de priorité (EDD pondéré) ;
 *  - une répartition jour-par-jour sur un horizon (lissage de charge) ;
 *  - la charge cumulée par producteur vs sa capacité sur l'horizon.
 *
 * 100 % JS pur, aucune dépendance, testable isolément.
 */

/** Statuts considérés comme "travail en cours" (à planifier). */
export const ACTIVE_STATES = ['pending', 'waiting', 'sav'];

export type RiskLevel = 'late' | 'tight' | 'ok';

export type ScheduledProject = {
  project: Project;
  workload: WorkloadEstimate;
  /** Jours ouvrés entre aujourd'hui et la deadline (négatif = dépassée) */
  daysRemaining: number;
  /** daysRemaining − charge estimée */
  margin: number;
  risk: RiskLevel;
  /** Score de tri (plus élevé = plus urgent) */
  urgency: number;
};

const PRIORITY_RANK: Record<string, number> = { high: 150, medium: 75, low: 0 };

// ---------------------------------------------------------------------------
// Utilitaires de dates (jours ouvrés, lundi→vendredi)
// ---------------------------------------------------------------------------

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Minuit local d'une date (copie, n'altère pas l'original). */
function atMidnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/**
 * Nombre de jours ouvrés entre `from` (inclus) et `to`.
 * Positif si `to` est dans le futur, négatif si dépassé.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const start = atMidnight(from);
  const end = atMidnight(to);
  if (start.getTime() === end.getTime()) return 0;

  const sign = end > start ? 1 : -1;
  const a = sign > 0 ? start : end;
  const b = sign > 0 ? end : start;

  let count = 0;
  const cur = new Date(a);
  while (cur < b) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count++;
  }
  return count * sign;
}

/** Renvoie les `n` prochains jours ouvrés à partir d'aujourd'hui (inclus si ouvré). */
export function nextBusinessDays(n: number, today = new Date()): Date[] {
  const days: Date[] = [];
  const cur = atMidnight(today);
  while (days.length < n) {
    if (!isWeekend(cur)) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Risque + urgence
// ---------------------------------------------------------------------------

function riskLevel(margin: number): RiskLevel {
  if (margin < 0) return 'late';
  if (margin < 2) return 'tight';
  return 'ok';
}

function riskBase(risk: RiskLevel): number {
  return risk === 'late' ? 1000 : risk === 'tight' ? 500 : 0;
}

function urgencyScore(
  risk: RiskLevel,
  priority: string | undefined,
  price: number,
  margin: number
): number {
  const valueBonus = Math.min((price || 0) / 100, 200); // plafonné à +200
  return (
    riskBase(risk) +
    (PRIORITY_RANK[priority ?? 'medium'] ?? 75) +
    valueBonus -
    margin * 10
  );
}

/**
 * Analyse une liste de projets et renvoie les projets actifs triés par urgence
 * décroissante. Les projets sans deadline ou hors statut actif sont ignorés.
 */
export function analyzeProjects(
  projects: Project[],
  today = new Date(),
  manualOverrides: Record<string, number> = {}
): ScheduledProject[] {
  const scheduled: ScheduledProject[] = [];

  for (const project of projects) {
    if (!ACTIVE_STATES.includes(project.state)) continue;
    if (!project.endDate) continue;

    const workload = estimateWorkload(project, manualOverrides[project.documentId]);
    const daysRemaining = businessDaysBetween(today, new Date(project.endDate));
    const margin = Math.round((daysRemaining - workload.days) * 10) / 10;
    const risk = riskLevel(margin);

    scheduled.push({
      project,
      workload,
      daysRemaining,
      margin,
      risk,
      urgency: urgencyScore(risk, project.priority, project.price, margin),
    });
  }

  return scheduled.sort((a, b) => b.urgency - a.urgency);
}

// ---------------------------------------------------------------------------
// Répartition jour-par-jour (lissage de charge)
// ---------------------------------------------------------------------------

export type DayPlan = { date: Date; items: ScheduledProject[] };

/**
 * Répartit chaque projet sur des jours ouvrés consécutifs.
 *  - Risque `late` / `tight` → démarre dès que possible (aujourd'hui).
 *  - Risque `ok` → démarre au plus tard pour finir juste avant la deadline
 *    (lissage : on n'encombre pas le début du planning).
 * Plusieurs projets peuvent partager un même jour (producteurs différents).
 */
export function buildWeekPlan(
  scheduled: ScheduledProject[],
  weeks = 2,
  today = new Date()
): DayPlan[] {
  const days = nextBusinessDays(weeks * 5, today);
  const plan: DayPlan[] = days.map((date) => ({ date, items: [] }));

  for (const sp of scheduled) {
    const need = Math.max(1, Math.ceil(sp.workload.days));

    let startIdx = 0;
    if (sp.risk === 'ok') {
      // démarre au plus tard : deadline (en index horizon) − besoin
      const deadlineIdx = days.findIndex(
        (d) => atMidnightTime(d) >= atMidnightTime(new Date(sp.project.endDate))
      );
      const lastUsable = deadlineIdx === -1 ? days.length - 1 : deadlineIdx;
      startIdx = Math.max(0, lastUsable - need + 1);
    }

    for (let k = 0; k < need; k++) {
      const idx = startIdx + k;
      if (idx >= 0 && idx < plan.length) plan[idx].items.push(sp);
    }
  }

  return plan;
}

function atMidnightTime(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

// ---------------------------------------------------------------------------
// Charge par producteur
// ---------------------------------------------------------------------------

export type ProducerLoad = {
  producerId: string;
  producerName: string;
  /** Charge cumulée (jours-homme) des projets actifs assignés */
  totalDays: number;
  /** Capacité de l'horizon (jours-homme disponibles) */
  capacityDays: number;
  /** Nombre de projets assignés */
  projectCount: number;
  overloaded: boolean;
  /** true si la capacité vient d'une config admin (vs valeur par défaut) */
  hasCustomCapacity: boolean;
};

/** Capacité configurée d'un producteur (issue du backend Planning). */
export type CapacityConfig = {
  dailyCapacityDays: number;
  weeklyOffDays?: number[];
  unavailableDates?: string[];
};

function isoDay(d: Date): string {
  const c = atMidnight(d);
  const m = `${c.getMonth() + 1}`.padStart(2, '0');
  const day = `${c.getDate()}`.padStart(2, '0');
  return `${c.getFullYear()}-${m}-${day}`;
}

/**
 * Capacité d'un producteur sur l'horizon, en jours-homme :
 *   (jours ouvrés de l'horizon − jours off hebdo − congés ponctuels) × capacité/jour.
 * Sans config → 1 jour-homme par jour ouvré de l'horizon.
 */
function capacityForHorizon(cap: CapacityConfig | undefined, horizonDays: Date[]): number {
  if (!cap) return horizonDays.length;
  const off = new Set(cap.weeklyOffDays ?? []);
  const unavailable = new Set(cap.unavailableDates ?? []);
  const usable = horizonDays.filter((d) => !off.has(d.getDay()) && !unavailable.has(isoDay(d)));
  return Math.round(usable.length * cap.dailyCapacityDays * 10) / 10;
}

/**
 * Agrège la charge par producteur sur l'horizon. Surcharge si charge cumulée >
 * capacité. Les capacités configurées (admin) sont prises en compte si fournies.
 */
export function computeProducerLoads(
  scheduled: ScheduledProject[],
  weeks = 2,
  capacities: Record<string, CapacityConfig> = {},
  today = new Date()
): ProducerLoad[] {
  const horizonDays = nextBusinessDays(weeks * 5, today);
  const byProducer = new Map<string, ProducerLoad>();

  for (const sp of scheduled) {
    const producer = sp.project.producer;
    const id = producer?.documentId ?? '__unassigned__';
    const name = producer?.name ?? 'Non assigné';

    const existing = byProducer.get(id);
    if (existing) {
      existing.totalDays = Math.round((existing.totalDays + sp.workload.days) * 10) / 10;
      existing.projectCount += 1;
      existing.overloaded = existing.totalDays > existing.capacityDays;
    } else {
      const cap = capacities[id];
      const capacityDays = capacityForHorizon(cap, horizonDays);
      byProducer.set(id, {
        producerId: id,
        producerName: name,
        totalDays: sp.workload.days,
        capacityDays,
        projectCount: 1,
        overloaded: sp.workload.days > capacityDays,
        hasCustomCapacity: !!cap,
      });
    }
  }

  return Array.from(byProducer.values()).sort((a, b) => b.totalDays - a.totalDays);
}

// ---------------------------------------------------------------------------
// Simulation « et si… » (100 % client, déterministe)
// ---------------------------------------------------------------------------

export type SimChange = {
  projectDocumentId: string;
  /** Nouvelle deadline (ISO) — décale la date de fin */
  newEndDate?: string;
  /** Nouvelle durée estimée (jours-homme) */
  newDays?: number;
};

/**
 * Applique une liste de changements à une COPIE des projets et renvoie les
 * projets simulés + les overrides de durée induits (à fusionner avec les
 * overrides existants avant `analyzeProjects`). N'altère jamais les originaux.
 */
export function applySimChanges(
  projects: Project[],
  changes: SimChange[]
): { projects: Project[]; overrides: Record<string, number> } {
  const byId = new Map(changes.map((c) => [c.projectDocumentId, c]));
  const overrides: Record<string, number> = {};

  const simProjects = projects.map((p) => {
    const change = byId.get(p.documentId);
    if (!change) return p;
    if (change.newDays != null && change.newDays > 0) overrides[p.documentId] = change.newDays;
    if (change.newEndDate) return { ...p, endDate: new Date(change.newEndDate) };
    return p;
  });

  return { projects: simProjects, overrides };
}

// ---------------------------------------------------------------------------
// Agrégat de comptage
// ---------------------------------------------------------------------------

export type RiskCounts = { late: number; tight: number; ok: number; total: number };

export function countRisks(scheduled: ScheduledProject[]): RiskCounts {
  return scheduled.reduce<RiskCounts>(
    (acc, sp) => {
      acc[sp.risk] += 1;
      acc.total += 1;
      return acc;
    },
    { late: 0, tight: 0, ok: 0, total: 0 }
  );
}
