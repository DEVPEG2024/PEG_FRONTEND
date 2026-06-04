import { apiTestChat, Message } from './ChatbotServices';
import {
  ScheduledProject,
  ProducerLoad,
  RiskCounts,
} from '@/utils/planning/scheduler';

/**
 * Couche IA explicative du planificateur (Niveau 3).
 *
 * Le moteur déterministe (scheduler.ts) reste la SOURCE DE VÉRITÉ : tous les
 * chiffres viennent de lui. L'IA ne fait qu'expliquer / résumer la situation en
 * langage naturel.
 *
 * Deux niveaux :
 *  - `localSummary()` : résumé déterministe généré côté client (toujours dispo).
 *  - `apiPlanningSummary()` : raffinement via l'endpoint LLM existant
 *    (`/chatbot/test`), avec repli automatique sur le résumé local en cas
 *    d'erreur ou de réponse vide. Aucun changement backend requis.
 */

export type PlanningSnapshot = {
  counts: RiskCounts;
  topPriorities: {
    name: string;
    risk: string;
    daysRemaining: number;
    workloadDays: number;
    price: number;
    producer: string;
  }[];
  overloadedProducers: {
    name: string;
    totalDays: number;
    capacityDays: number;
    projectCount: number;
  }[];
};

const RISK_LABEL: Record<string, string> = {
  late: 'en retard',
  tight: 'serré',
  ok: 'sous contrôle',
};

export function buildSnapshot(
  scheduled: ScheduledProject[],
  producerLoads: ProducerLoad[],
  counts: RiskCounts,
  topN = 6
): PlanningSnapshot {
  return {
    counts,
    topPriorities: scheduled.slice(0, topN).map((sp) => ({
      name: sp.project.name,
      risk: sp.risk,
      daysRemaining: sp.daysRemaining,
      workloadDays: sp.workload.days,
      price: sp.project.price || 0,
      producer: sp.project.producer?.name ?? 'Non assigné',
    })),
    overloadedProducers: producerLoads
      .filter((p) => p.overloaded)
      .map((p) => ({
        name: p.producerName,
        totalDays: p.totalDays,
        capacityDays: p.capacityDays,
        projectCount: p.projectCount,
      })),
  };
}

/** Résumé déterministe (toujours disponible, sans appel réseau). */
export function localSummary(s: PlanningSnapshot): string {
  const { late, tight, ok, total } = s.counts;
  if (total === 0) {
    return "Aucun projet en cours à planifier. Rien d'urgent pour le moment.";
  }

  const parts: string[] = [];

  if (late > 0) {
    parts.push(
      `🔴 ${late} projet(s) en retard sur la deadline au rythme estimé — à traiter en priorité absolue.`
    );
  }
  if (tight > 0) {
    parts.push(
      `🟠 ${tight} projet(s) en marge serrée : peu de jours de battement, à surveiller de près.`
    );
  }
  if (ok > 0) {
    parts.push(`🟢 ${ok} projet(s) avec une marge confortable.`);
  }

  const focus = s.topPriorities.slice(0, 3);
  if (focus.length > 0) {
    const list = focus
      .map((p) => {
        const when =
          p.daysRemaining < 0
            ? `deadline dépassée de ${Math.abs(p.daysRemaining)} j ouvrés`
            : `${p.daysRemaining} j ouvrés restants`;
        return `« ${p.name} » (${RISK_LABEL[p.risk] ?? p.risk}, ${when}, ~${p.workloadDays} j de travail, ${p.producer})`;
      })
      .join(' ; ');
    parts.push(`À attaquer en premier : ${list}.`);
  }

  if (s.overloadedProducers.length > 0) {
    const list = s.overloadedProducers
      .map(
        (p) =>
          `${p.name} (${p.totalDays} j de charge pour ${p.capacityDays} j dispo, ${p.projectCount} projets)`
      )
      .join(' ; ');
    parts.push(
      `⚠️ Producteur(s) en surcharge sur la quinzaine : ${list}. Envisager de redistribuer ou décaler.`
    );
  }

  return parts.join('\n\n');
}

function buildPrompt(s: PlanningSnapshot): string {
  return [
    "Tu es l'assistant de planification d'un studio de production (PEG).",
    "À partir des données d'ordonnancement ci-dessous (déjà calculées, ne les recalcule pas),",
    'rédige en français un résumé clair et actionnable pour un administrateur :',
    "1) la situation générale, 2) les 3 projets à attaquer en premier et pourquoi,",
    '3) les risques de surcharge producteur et une suggestion concrète.',
    'Sois concis (max ~150 mots), ton professionnel, pas de blabla.',
    '',
    'DONNÉES (JSON) :',
    JSON.stringify(s, null, 2),
  ].join('\n');
}

/**
 * Résumé via LLM, avec repli déterministe. Ne lève jamais : renvoie toujours
 * une chaîne exploitable.
 */
export async function apiPlanningSummary(s: PlanningSnapshot): Promise<string> {
  try {
    const messages: Message[] = [{ role: 'user', content: buildPrompt(s) }];
    const res = await apiTestChat(messages);
    const reply = res?.data?.reply;
    if (reply && reply.trim().length > 0) {
      return reply.trim();
    }
  } catch {
    // silencieux : on retombe sur le résumé local
  }
  return localSummary(s);
}
