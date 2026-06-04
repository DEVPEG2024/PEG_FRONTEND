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

// ---------------------------------------------------------------------------
// Score de santé /100 (100 = très confortable, bas = à risque)
// ---------------------------------------------------------------------------

export function riskScore(sp: ScheduledProject): number {
  return Math.max(2, Math.min(98, Math.round(50 + sp.margin * 10)));
}

// ---------------------------------------------------------------------------
// Semaine courante (lun→dim) + numéro de semaine ISO
// ---------------------------------------------------------------------------

export function currentWeekDays(today = new Date()): Date[] {
  const d = atMidnight(today);
  const dow = d.getDay(); // 0=dim … 6=sam
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(d, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isoWeekNumber(d = new Date()): number {
  const date = atMidnight(d);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ---------------------------------------------------------------------------
// Matrice ressources : producteurs (lignes) × projets répartis (board)
// ---------------------------------------------------------------------------

export type ResourceBlock = {
  kind: 'project' | 'available';
  project?: ScheduledProject;
  days: number;
  risk?: RiskLevel;
};

export type ResourceRow = {
  producerId: string;
  producerName: string;
  totalDays: number;
  capacityDays: number;
  ratioPct: number;
  overloaded: boolean;
  blocks: ResourceBlock[];
};

export function buildResourceMatrix(
  scheduled: ScheduledProject[],
  producerLoads: ProducerLoad[]
): ResourceRow[] {
  const byProducer = new Map<string, ScheduledProject[]>();
  for (const sp of scheduled) {
    const id = sp.project.producer?.documentId ?? '__unassigned__';
    const arr = byProducer.get(id);
    if (arr) arr.push(sp);
    else byProducer.set(id, [sp]);
  }

  return producerLoads.map((pl) => {
    const projs = (byProducer.get(pl.producerId) ?? []).slice().sort((a, b) => b.urgency - a.urgency);
    const blocks: ResourceBlock[] = projs.map((sp) => ({
      kind: 'project',
      project: sp,
      days: sp.workload.days,
      risk: sp.risk,
    }));
    const free = Math.round((pl.capacityDays - pl.totalDays) * 10) / 10;
    if (free > 0.1) blocks.push({ kind: 'available', days: free });
    return {
      producerId: pl.producerId,
      producerName: pl.producerName,
      totalDays: pl.totalDays,
      capacityDays: pl.capacityDays,
      ratioPct: pl.capacityDays > 0 ? Math.round((pl.totalDays / pl.capacityDays) * 100) : 0,
      overloaded: pl.overloaded,
      blocks,
    };
  });
}

// ---------------------------------------------------------------------------
// Charge prévisionnelle par semaine (load % vs capacité)
// ---------------------------------------------------------------------------

export type ForecastPoint = { label: string; loadPct: number };

export function buildForecast(
  scheduled: ScheduledProject[],
  producerCount: number,
  weeks = 6,
  today = new Date()
): ForecastPoint[] {
  const weeklyCapacity = Math.max(1, producerCount) * 5; // 1 j-homme / jour ouvré
  const startWeek = isoWeekNumber(today);
  const monday = currentWeekDays(today)[0];

  const points: ForecastPoint[] = [];
  for (let w = 0; w < weeks; w++) {
    const from = addDays(monday, w * 7);
    const to = addDays(from, 7);
    let load = 0;
    for (const sp of scheduled) {
      const end = new Date(sp.project.endDate);
      if (end >= from && end < to) load += sp.workload.days;
    }
    points.push({
      label: `Sem. ${startWeek + w}`,
      loadPct: Math.round((load / weeklyCapacity) * 100),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Actions recommandées (heuristiques déterministes à partir du moteur)
// ---------------------------------------------------------------------------

// ===========================================================================
// ÉTALEMENT TEMPOREL en blocs de 30 min (modèle métier)
// ---------------------------------------------------------------------------
// Le travail requis par un projet (en jours d'effort) est converti en blocs de
// 30 min, puis ÉTALÉ UNIFORMÉMENT sur les jours ouvrés disponibles entre
// aujourd'hui et la deadline. Chaque jour reçoit ainsi une petite tranche, et
// la charge d'un producteur un jour donné = somme des tranches de tous ses
// projets ce jour-là (vs sa capacité quotidienne).
// ===========================================================================

/** Heures de travail effectif par jour ouvré (1 jour d'effort = HOURS_PER_DAY h). */
export const HOURS_PER_DAY = 4;
/** Un bloc = 30 min → 2 blocs/heure. */
export const BLOCKS_PER_HOUR = 2;
/** Blocs de 30 min dans un jour d'effort plein. */
export const BLOCKS_PER_EFFORT_DAY = HOURS_PER_DAY * BLOCKS_PER_HOUR; // 8

/** Formate un nombre de blocs de 30 min en "2h", "1h30", "30min". */
export function formatBlocks(blocks: number): string {
  const totalMin = Math.round(blocks) * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${`${m}`.padStart(2, '0')}`;
}

function dateKey(d: Date): string {
  const c = atMidnight(d);
  return `${c.getFullYear()}-${`${c.getMonth() + 1}`.padStart(2, '0')}-${`${c.getDate()}`.padStart(2, '0')}`;
}

/** Un producteur est-il disponible ce jour (Lun→Ven, hors jours off / congés) ? */
function isAvailable(date: Date, cap: CapacityConfig | undefined): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false; // week-ends exclus
  if (cap?.weeklyOffDays?.includes(dow)) return false;
  if (cap?.unavailableDates?.includes(dateKey(date))) return false;
  return true;
}

/** Répartit `total` blocs sur `n` jours de façon la plus uniforme possible (somme = total). */
function spreadEvenly(total: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.floor((total * (i + 1)) / n) - Math.floor((total * i) / n));
  }
  return out;
}

export type DayLoadDetail = { documentId: string; name: string; risk: RiskLevel; blocks: number };
export type ProducerDayLoad = { blocks: number; capacityBlocks: number; details: DayLoadDetail[] };

export type TimelineRow = {
  producerId: string;
  producerName: string;
  dailyCapacityBlocks: number;
  byDay: Record<string, ProducerDayLoad>;
};

/**
 * Construit l'étalement : pour chaque producteur, la charge (en blocs de 30 min)
 * par jour, issue de l'étalement uniforme de chaque projet sur ses jours
 * disponibles jusqu'à la deadline.
 */
export function buildTimeline(
  scheduled: ScheduledProject[],
  capacities: Record<string, CapacityConfig> = {},
  today = new Date()
): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
  const start0 = atMidnight(today);

  const getRow = (id: string, name: string): TimelineRow => {
    let r = rows.get(id);
    if (!r) {
      const cap = capacities[id];
      const dailyCapacityBlocks = Math.max(1, Math.round((cap?.dailyCapacityDays ?? 1) * BLOCKS_PER_EFFORT_DAY));
      r = { producerId: id, producerName: name, dailyCapacityBlocks, byDay: {} };
      rows.set(id, r);
    }
    return r;
  };

  for (const sp of scheduled) {
    const id = sp.project.producer?.documentId ?? '__unassigned__';
    const name = sp.project.producer?.name ?? 'Non assigné';
    const row = getRow(id, name);
    const cap = capacities[id];

    const effortBlocks = Math.max(1, Math.round(sp.workload.days * BLOCKS_PER_EFFORT_DAY));

    // Fenêtre = jours dispo de max(aujourd'hui, début) jusqu'à la deadline
    const startD = sp.project.startDate ? atMidnight(new Date(sp.project.startDate)) : start0;
    const begin = startD > start0 ? startD : start0;
    const end = atMidnight(new Date(sp.project.endDate));

    const windowDates: Date[] = [];
    const cur = new Date(begin);
    while (cur <= end && windowDates.length < 365) {
      if (isAvailable(cur, cap)) windowDates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    // En retard / aucun jour dispo → on entasse sur le prochain jour disponible
    if (windowDates.length === 0) {
      const c = new Date(start0);
      while (!isAvailable(c, cap)) c.setDate(c.getDate() + 1);
      windowDates.push(c);
    }

    const alloc = spreadEvenly(effortBlocks, windowDates.length);
    windowDates.forEach((d, i) => {
      if (alloc[i] <= 0) return;
      const k = dateKey(d);
      const day = row.byDay[k] ?? (row.byDay[k] = { blocks: 0, capacityBlocks: row.dailyCapacityBlocks, details: [] });
      day.blocks += alloc[i];
      day.details.push({ documentId: sp.project.documentId, name: sp.project.name, risk: sp.risk, blocks: alloc[i] });
    });
  }

  return Array.from(rows.values());
}

export type RecommendedAction = {
  icon: 'reassign' | 'shift' | 'accept';
  title: string;
  detail: string;
  badge: string;
  tone: RiskLevel;
};

export function recommendActions(
  scheduled: ScheduledProject[],
  producerLoads: ProducerLoad[]
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const real = producerLoads.filter((p) => p.producerId !== '__unassigned__');
  const overloaded = real.filter((p) => p.overloaded);
  const underloaded = real
    .filter((p) => !p.overloaded)
    .sort((a, b) => a.totalDays / a.capacityDays - b.totalDays / b.capacityDays);

  for (const ov of overloaded.slice(0, 2)) {
    const projs = scheduled
      .filter((s) => s.project.producer?.documentId === ov.producerId)
      .sort((a, b) => b.workload.days - a.workload.days);
    const heavy = projs[0];
    const target = underloaded[0];
    if (heavy && target) {
      const pct = Math.round((heavy.workload.days / Math.max(1, ov.capacityDays)) * 100);
      actions.push({
        icon: 'reassign',
        tone: 'late',
        title: `Réaffecter « ${heavy.project.name} » de ${ov.producerName} vers ${target.producerName}`,
        detail: `Libère ${heavy.workload.days} j et réduit le risque de retard`,
        badge: `+${pct}% capacité`,
      });
    }
  }

  for (const t of scheduled.filter((s) => s.risk === 'tight').slice(0, 2 - actions.length + 1)) {
    if (actions.length >= 3) break;
    actions.push({
      icon: 'shift',
      tone: 'tight',
      title: `Décaler « ${t.project.name} » de 1 jour`,
      detail: 'Évite une surcharge ponctuelle',
      badge: 'marge +1 j',
    });
  }

  return actions.slice(0, 4);
}
