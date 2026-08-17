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

/** Ligne fictive regroupant les projets sans producteur assigné. */
export const UNASSIGNED_ID = '__unassigned__';

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

/**
 * Projets qui devraient être planifiés mais ne peuvent pas l'être : statut actif
 * mais aucune date de fin. Ils sont silencieusement écartés par
 * `analyzeProjects` — les compter permet de le signaler à l'admin.
 */
export function unplannableProjects(projects: Project[]): Project[] {
  return projects.filter((p) => ACTIVE_STATES.includes(p.state) && !p.endDate);
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

/**
 * Capacité d'un producteur sur l'horizon, en jours-homme :
 *   (jours ouvrés de l'horizon − jours off hebdo − congés ponctuels) × capacité/jour.
 * Sans config → 1 jour-homme par jour ouvré de l'horizon.
 */
function capacityForHorizon(cap: CapacityConfig | undefined, horizonDays: Date[]): number {
  if (!cap) return horizonDays.length;
  const off = new Set(cap.weeklyOffDays ?? []);
  const unavailable = new Set(cap.unavailableDates ?? []);
  const usable = horizonDays.filter((d) => !off.has(d.getDay()) && !unavailable.has(dateKey(d)));
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
    const id = producer?.documentId ?? UNASSIGNED_ID;
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

/** Clé de jour `YYYY-MM-DD` en heure LOCALE (jamais `toISOString`, qui décale). */
export function dateKey(d: Date): string {
  const c = atMidnight(d);
  return `${c.getFullYear()}-${`${c.getMonth() + 1}`.padStart(2, '0')}-${`${c.getDate()}`.padStart(2, '0')}`;
}

export function isWeekendDay(d: Date): boolean {
  return isWeekend(d);
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
/**
 * Charge d'un producteur un jour donné. La capacité n'est volontairement PAS
 * stockée ici : elle se lit via `capacityBlocksOn(row, date)`, seule à connaître
 * les jours off et les congés. Deux sources se seraient contredites.
 */
export type ProducerDayLoad = { blocks: number; details: DayLoadDetail[] };

export type TimelineRow = {
  producerId: string;
  producerName: string;
  dailyCapacityBlocks: number;
  /**
   * Config de dispo du producteur — indispensable pour ne PAS compter comme
   * capacité les jours off hebdo et les congés (sinon les % de charge sont
   * mécaniquement sous-évalués).
   */
  capacity?: CapacityConfig;
  byDay: Record<string, ProducerDayLoad>;
};

/** Capacité réellement disponible (en blocs de 30 min) d'un producteur un jour donné. */
export function capacityBlocksOn(row: TimelineRow, date: Date): number {
  return isAvailable(date, row.capacity) ? row.dailyCapacityBlocks : 0;
}

export type LoadStats = { usedBlocks: number; capacityBlocks: number; pct: number };

/** Charge vs capacité d'UN producteur sur une plage de jours. */
export function timelineRowStats(row: TimelineRow, days: Date[]): LoadStats {
  let usedBlocks = 0;
  let capacityBlocks = 0;
  for (const d of days) {
    usedBlocks += row.byDay[dateKey(d)]?.blocks ?? 0;
    capacityBlocks += capacityBlocksOn(row, d);
  }
  return {
    usedBlocks,
    capacityBlocks,
    pct: capacityBlocks > 0 ? Math.round((usedBlocks / capacityBlocks) * 100) : usedBlocks > 0 ? 100 : 0,
  };
}

/**
 * Agrégat charge/capacité sur une plage de jours, hors ligne « Non assigné »
 * (qui n'a pas de capacité réelle). `avgPct` = moyenne des taux par producteur,
 * `pct` = taux global (blocs utilisés / blocs disponibles).
 */
export function timelineStats(
  rows: TimelineRow[],
  days: Date[]
): LoadStats & { avgPct: number; freeBlocks: number; producerCount: number } {
  const real = rows.filter((r) => r.producerId !== UNASSIGNED_ID);
  let usedBlocks = 0;
  let capacityBlocks = 0;
  const ratios: number[] = [];
  for (const r of real) {
    const s = timelineRowStats(r, days);
    usedBlocks += s.usedBlocks;
    capacityBlocks += s.capacityBlocks;
    ratios.push(s.pct);
  }
  return {
    usedBlocks,
    capacityBlocks,
    pct: capacityBlocks > 0 ? Math.round((usedBlocks / capacityBlocks) * 100) : 0,
    avgPct: ratios.length ? Math.round(ratios.reduce((s, x) => s + x, 0) / ratios.length) : 0,
    freeBlocks: Math.max(0, capacityBlocks - usedBlocks),
    producerCount: real.length,
  };
}

/**
 * Construit l'étalement : pour chaque producteur, la charge (en blocs de 30 min)
 * par jour, issue de l'étalement uniforme de chaque projet sur ses jours
 * disponibles jusqu'à la deadline.
 */
/** Heures/jour en mode Flash (journées intensives). */
export const FLASH_HOURS_PER_DAY = 16;
const FLASH_CAP_BLOCKS = FLASH_HOURS_PER_DAY * BLOCKS_PER_HOUR; // 32

/**
 * Mode FLASH : au lieu d'étaler, on COMPACTE le travail au plus tôt, en
 * journées de 16h. Pour chaque producteur, on remplit les jours ouvrés
 * consécutifs (dès aujourd'hui) à 16h/jour, projet par projet (deadline la plus
 * proche d'abord), jusqu'à épuisement → le travail finit le plus tôt possible.
 */
function buildFlashTimeline(
  scheduled: ScheduledProject[],
  capacities: Record<string, CapacityConfig>,
  today: Date
): TimelineRow[] {
  const start0 = atMidnight(today);
  const byProducer = new Map<string, ScheduledProject[]>();
  for (const sp of scheduled) {
    const id = sp.project.producer?.documentId ?? UNASSIGNED_ID;
    const arr = byProducer.get(id);
    if (arr) arr.push(sp);
    else byProducer.set(id, [sp]);
  }

  const rows: TimelineRow[] = [];
  byProducer.forEach((group, id) => {
    const cap = capacities[id];
    const name = group[0].project.producer?.name ?? 'Non assigné';
    const row: TimelineRow = { producerId: id, producerName: name, dailyCapacityBlocks: FLASH_CAP_BLOCKS, capacity: cap, byDay: {} };

    const items = group
      .map((sp) => ({ sp, remaining: Math.max(1, Math.round(sp.workload.days * BLOCKS_PER_EFFORT_DAY)) }))
      .sort((a, b) => new Date(a.sp.project.endDate).getTime() - new Date(b.sp.project.endDate).getTime() || b.sp.urgency - a.sp.urgency);

    const cur = new Date(start0);
    let guard = 0;
    while (items.some((it) => it.remaining > 0) && guard < 800) {
      let dg = 0;
      while (!isAvailable(cur, cap) && dg < 30) { cur.setDate(cur.getDate() + 1); dg++; }
      const k = dateKey(cur);
      let dayCap = FLASH_CAP_BLOCKS;
      for (const it of items) {
        if (dayCap <= 0) break;
        if (it.remaining <= 0) continue;
        const take = Math.min(it.remaining, dayCap);
        const day = row.byDay[k] ?? (row.byDay[k] = { blocks: 0, details: [] });
        day.blocks += take;
        day.details.push({ documentId: it.sp.project.documentId, name: it.sp.project.name, risk: it.sp.risk, blocks: take });
        it.remaining -= take;
        dayCap -= take;
      }
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    rows.push(row);
  });

  return rows;
}

export function buildTimeline(
  scheduled: ScheduledProject[],
  capacities: Record<string, CapacityConfig> = {},
  today = new Date(),
  opts: { flash?: boolean } = {}
): TimelineRow[] {
  if (opts.flash) return buildFlashTimeline(scheduled, capacities, today);

  const rows = new Map<string, TimelineRow>();
  const start0 = atMidnight(today);

  const getRow = (id: string, name: string): TimelineRow => {
    let r = rows.get(id);
    if (!r) {
      const cap = capacities[id];
      const dailyCapacityBlocks = Math.max(1, Math.round((cap?.dailyCapacityDays ?? 1) * BLOCKS_PER_EFFORT_DAY));
      r = { producerId: id, producerName: name, dailyCapacityBlocks, capacity: cap, byDay: {} };
      rows.set(id, r);
    }
    return r;
  };

  for (const sp of scheduled) {
    const id = sp.project.producer?.documentId ?? UNASSIGNED_ID;
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
    let guard = 0;
    while (cur <= end && guard < 366) {
      if (isAvailable(cur, cap)) windowDates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    // Deadline dépassée (ou plus aucun jour dispo avant elle) → PLAN DE
    // RATTRAPAGE : l'effort est réparti au rythme de la capacité quotidienne dès
    // le prochain jour disponible. Sans ça, tout l'effort d'un projet en retard
    // s'empilait sur UN seul jour et créait un pic de charge fictif.
    // Borné pour éviter toute boucle infinie si le producteur n'a aucune dispo.
    if (windowDates.length === 0) {
      const needed = Math.max(1, Math.ceil(effortBlocks / row.dailyCapacityBlocks));
      const c = new Date(start0);
      let g = 0;
      while (windowDates.length < needed && g < 400) {
        if (isAvailable(c, cap)) windowDates.push(new Date(c));
        c.setDate(c.getDate() + 1);
        g++;
      }
      if (windowDates.length === 0) windowDates.push(new Date(start0)); // garantie
    }

    const alloc = spreadEvenly(effortBlocks, windowDates.length);
    windowDates.forEach((d, i) => {
      if (alloc[i] <= 0) return;
      const k = dateKey(d);
      const day = row.byDay[k] ?? (row.byDay[k] = { blocks: 0, details: [] });
      day.blocks += alloc[i];
      day.details.push({ documentId: sp.project.documentId, name: sp.project.name, risk: sp.risk, blocks: alloc[i] });
    });
  }

  return Array.from(rows.values());
}

// ---------------------------------------------------------------------------
// Séries dérivées de la timeline (SOURCE UNIQUE : le même étalement que le board)
// ---------------------------------------------------------------------------

export type ForecastPoint = {
  label: string;
  loadPct: number;
  usedBlocks: number;
  capacityBlocks: number;
};

/**
 * Charge prévisionnelle par semaine, calculée à partir de l'étalement RÉEL
 * (`buildTimeline`) et des capacités RÉELLES des producteurs.
 *
 * ⚠️ Ne jamais revenir à un calcul indépendant (charge posée sur la semaine de
 * la deadline, capacité = producteurs × 5) : le graphe contredisait alors le
 * board affiché juste au-dessus.
 */
export function buildForecastFromTimeline(
  rows: TimelineRow[],
  weeks = 6,
  today = new Date()
): ForecastPoint[] {
  const monday = currentWeekDays(today)[0];
  const points: ForecastPoint[] = [];

  for (let w = 0; w < weeks; w++) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, w * 7 + i));
    const s = timelineStats(rows, days);
    points.push({
      label: `Sem. ${isoWeekNumber(days[0])}`,
      loadPct: s.pct,
      usedBlocks: s.usedBlocks,
      capacityBlocks: s.capacityBlocks,
    });
  }
  return points;
}

/** Taux de charge quotidien (%) sur une plage — série pour sparkline. */
export function dailyLoadSeries(rows: TimelineRow[], days: Date[]): number[] {
  return days.map((d) => timelineStats(rows, [d]).pct);
}

/**
 * Nombre de projets d'un niveau de risque donné dont la deadline tombe dans
 * chacune des `weeks` prochaines semaines. Contrairement à l'ancienne série
 * (projets actifs par jour, qui décroissait mécaniquement vers 0), celle-ci
 * répond à une vraie question : « quand tombent les échéances à risque ? ».
 */
export function deadlineSeries(
  scheduled: ScheduledProject[],
  risk: RiskLevel,
  weeks = 6,
  today = new Date()
): number[] {
  const monday = currentWeekDays(today)[0];
  return Array.from({ length: weeks }, (_, w) => {
    const from = addDays(monday, w * 7);
    const to = addDays(from, 7);
    return scheduled.filter((sp) => {
      if (sp.risk !== risk) return false;
      const end = atMidnight(new Date(sp.project.endDate));
      return end >= from && end < to;
    }).length;
  });
}

// ---------------------------------------------------------------------------
// Actions recommandées (heuristiques déterministes à partir du moteur)
// ---------------------------------------------------------------------------

export type RecommendedAction = {
  icon: 'reassign' | 'shift' | 'accept' | 'assign' | 'split';
  title: string;
  detail: string;
  badge: string;
  tone: RiskLevel;
  /** Projet concerné — permet d'ouvrir sa fiche depuis l'action. */
  projectDocumentId?: string;
  /** Changement à pré-charger dans la simulation « et si… ». */
  sim?: SimChange;
};

/** Ajoute `n` jours OUVRÉS à une date (n ≥ 0). */
export function addBusinessDays(from: Date, n: number): Date {
  const c = atMidnight(from);
  let left = Math.max(0, Math.round(n));
  let guard = 0;
  while (left > 0 && guard < 400) {
    c.setDate(c.getDate() + 1);
    if (!isWeekend(c)) left--;
    guard++;
  }
  return c;
}

const MAX_ACTIONS = 4;

/**
 * Actions concrètes déduites du moteur, de la plus à la moins rentable :
 * assigner un producteur → replanifier ce qui est déjà en retard → délester un
 * producteur surchargé → sécuriser les marges serrées.
 *
 * Chaque action embarque de quoi être EXÉCUTÉE (`projectDocumentId` pour ouvrir
 * la fiche, `sim` pour pré-remplir la simulation) — une recommandation qu'on ne
 * peut pas appliquer n'a aucune valeur.
 */
export function recommendActions(
  scheduled: ScheduledProject[],
  producerLoads: ProducerLoad[],
  today = new Date()
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const push = (a: RecommendedAction) => {
    if (actions.length < MAX_ACTIONS) actions.push(a);
  };

  // 1. Projets sans producteur : rien ne peut être planifié tant que c'est le cas.
  for (const sp of scheduled.filter((s) => !s.project.producer?.documentId).slice(0, 2)) {
    push({
      icon: 'assign',
      tone: sp.risk,
      title: `Assigner un producteur à « ${sp.project.name} »`,
      detail: `~${sp.workload.days} j de travail non affectés · échéance ${formatShortDate(sp.project.endDate)}`,
      badge: 'non assigné',
      projectDocumentId: sp.project.documentId,
    });
  }

  // 2. Projets déjà en retard : proposer une échéance TENABLE, chiffrée.
  for (const sp of scheduled.filter((s) => s.risk === 'late').sort((a, b) => a.margin - b.margin).slice(0, 2)) {
    const realistic = addBusinessDays(today, Math.ceil(sp.workload.days));
    push({
      icon: 'shift',
      tone: 'late',
      title: `Replanifier « ${sp.project.name} » au ${formatShortDate(realistic)}`,
      detail: `Il manque ${Math.abs(sp.margin)} j ouvrés pour tenir l'échéance actuelle`,
      badge: `+${Math.abs(Math.ceil(sp.margin))} j`,
      projectDocumentId: sp.project.documentId,
      sim: { projectDocumentId: sp.project.documentId, newEndDate: dateKey(realistic) },
    });
  }

  // 3. Producteurs surchargés : délester le plus gros projet vers le moins chargé.
  const real = producerLoads.filter((p) => p.producerId !== UNASSIGNED_ID);
  const ratio = (p: ProducerLoad) => (p.capacityDays > 0 ? p.totalDays / p.capacityDays : Infinity);
  const underloaded = real.filter((p) => !p.overloaded).sort((a, b) => ratio(a) - ratio(b));

  for (const ov of real.filter((p) => p.overloaded).slice(0, 2)) {
    const heavy = scheduled
      .filter((s) => s.project.producer?.documentId === ov.producerId)
      .sort((a, b) => b.workload.days - a.workload.days)[0];
    const target = underloaded[0];
    if (!heavy || !target) continue;
    const pct = Math.round((heavy.workload.days / Math.max(1, ov.capacityDays)) * 100);
    push({
      icon: 'reassign',
      tone: 'late',
      title: `Réaffecter « ${heavy.project.name} » de ${ov.producerName} vers ${target.producerName}`,
      detail: `Libère ${heavy.workload.days} j chez ${ov.producerName} (chargé à ${Math.round(ratio(ov) * 100)} %)`,
      badge: `−${pct} % de charge`,
      projectDocumentId: heavy.project.documentId,
    });
  }

  // 4. Marges serrées : gagner du battement en décalant l'échéance de 2 jours.
  for (const sp of scheduled.filter((s) => s.risk === 'tight').sort((a, b) => a.margin - b.margin)) {
    if (actions.length >= MAX_ACTIONS) break;
    const shifted = addBusinessDays(new Date(sp.project.endDate), 2);
    push({
      icon: 'shift',
      tone: 'tight',
      title: `Décaler « ${sp.project.name} » au ${formatShortDate(shifted)}`,
      detail: `Marge actuelle : ${sp.margin} j — un aléa suffit à faire basculer le projet`,
      badge: 'marge +2 j',
      projectDocumentId: sp.project.documentId,
      sim: { projectDocumentId: sp.project.documentId, newEndDate: dateKey(shifted) },
    });
  }

  return actions;
}

function formatShortDate(d: Date | string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
