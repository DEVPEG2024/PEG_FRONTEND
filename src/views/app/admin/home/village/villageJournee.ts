// Fiche « Ma journée » : ce que l'admin voit en arrivant sur le village (et en
// cliquant sur l'Accueil) — urgences, choses à traiter, livraisons et
// rendez-vous du jour, nouveautés depuis hier, projet le plus urgent.
// Fonctions pures, testées.
import dayjs from 'dayjs';
import { MENU_ORDER, type SectionId } from './villageScene';
import {
  TONE,
  plural,
  type ProjectCard,
  type VillageData,
} from './villageModel';
import { tourSteps } from './villageTour';

export interface JourneeRow {
  key: string;
  text: string;
  sub?: string;
  dot: string;
  /** Rubrique à ouvrir dans la fiche. */
  section?: SectionId;
  /** Projet à ouvrir dans la fiche. */
  projectId?: string;
  /** Page de l'application à ouvrir. */
  to?: string;
}

export interface Journee {
  /** « Mardi 21 octobre ». */
  dateLabel: string;
  /** « Bonjour Nova », « Bonsoir Nova ». */
  greeting: string;
  /** Une phrase qui résume la journée. */
  lead: string;
  urgent: JourneeRow[];
  todo: JourneeRow[];
  today: JourneeRow[];
  /** « 3 commandes · 2 tickets » ; null si rien de nouveau. */
  news: string | null;
  /** « 24 octobre, dans 3 jours » quand rien n'est à livrer aujourd'hui. */
  nextDelivery: string | null;
  /** Pense-bête du tableau de bord classique : tâches en cours (3 au plus) et leur nombre. */
  memo: { items: string[]; count: number };
  topProject: ProjectCard | null;
  /** Nombre d'étapes de « Ma tournée du jour ». */
  steps: number;
}

/** Familles de notifications, au singulier et au pluriel. */
const NEWS: Record<string, [string, string]> = {
  new_order: ['commande', 'commandes'],
  payment_received: ['paiement', 'paiements'],
  new_invoice: ['facture', 'factures'],
  new_ticket: ['ticket', 'tickets'],
  new_comment: ['message', 'messages'],
  project_status_change: ['projet avancé', 'projets avancés'],
  new_task: ['tâche', 'tâches'],
  task_status_change: ['tâche', 'tâches'],
  new_file: ['fichier', 'fichiers'],
};

/**
 * Résumé des notifications des dernières 24 heures, sous forme de chaîne
 * stable (« new_order:3|new_ticket:2 ») : sert de sélecteur Redux sans faire
 * redessiner le village à chaque passage du polling. La cloche ne charge que
 * les dernières notifications : si toutes datent de moins de 24 h et qu'il en
 * reste d'autres, le compte est incomplet (« |+ »).
 */
export const newsKey = (
  list: { eventType: string; createdAt?: string }[],
  now: number,
  hasMore = false
) => {
  const since = now - 24 * 3600_000;
  const counts = new Map<string, number>();
  let allRecent = list.length > 0;
  for (const n of list) {
    const at = n.createdAt ? Date.parse(n.createdAt) : NaN;
    if (!Number.isFinite(at) || at < since) {
      allRecent = false;
      continue;
    }
    if (!NEWS[n.eventType]) continue;
    // Deux types se lisent pareil (tâches) : on les regroupe.
    const k = n.eventType === 'task_status_change' ? 'new_task' : n.eventType;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const parts = Object.keys(NEWS)
    .filter((k) => counts.has(k))
    .map((k) => `${k}:${counts.get(k)}`);
  if (parts.length && hasMore && allRecent) parts.push('+');
  return parts.join('|');
};

/** « 3 commandes · 2 tickets · 1 message » à partir de newsKey ; null si vide. */
export const newsText = (key: string): string | null => {
  const items = key.split('|').filter(Boolean);
  const parts = items
    .map((p) => {
      const [type, n] = p.split(':');
      const count = Number(n) || 0;
      const words = NEWS[type];
      return words && count ? plural(count, words[0], words[1]) : '';
    })
    .filter(Boolean);
  if (!parts.length) return null;
  return `${parts.join(' · ')}${items.includes('+') ? ' · et d’autres' : ''}`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const buildJournee = (
  data: VillageData,
  titles: Record<SectionId, string>,
  news: string,
  firstName: string | null,
  now: Date
): Journee => {
  const d = dayjs(now);
  const sections = data.sections;
  const steps = tourSteps(sections);

  const urgent: JourneeRow[] = MENU_ORDER.filter(
    (id) => sections[id].alert
  ).map((id) => ({
    key: `u-${id}`,
    text: sections[id].alert as string,
    sub: titles[id],
    dot: TONE.red,
    section: id,
  }));

  // Le pense-bête a son propre bloc (ses tâches, pas seulement leur nombre).
  const pending = steps.filter((id) => !sections[id].alert);
  const todo: JourneeRow[] = pending
    .filter((id) => id !== 'accueil')
    .slice(0, 5)
    .map((id) => ({
      key: `t-${id}`,
      text: sections[id].chip,
      sub: titles[id],
      dot: sections[id].tone,
      section: id,
    }));

  const deliveries = data.todayDeliveries.slice(0, 4);
  const deliveryCount = Math.max(
    data.todayDeliveryCount,
    data.todayDeliveries.length
  );
  const moreDeliveries = deliveryCount - deliveries.length;
  const cal = sections.calendrier;
  const moreEvents = Math.max(0, (Number(cal.badge) || 0) - cal.items.length);
  const today: JourneeRow[] = [
    ...deliveries.map((p) => ({
      key: `l-${p.documentId}`,
      text: `Livraison : ${p.name}`,
      sub: p.customer,
      dot: TONE.green,
      projectId: p.documentId,
    })),
    ...(moreDeliveries > 0
      ? [
          {
            key: 'l-more',
            text: deliveries.length
              ? `${plural(moreDeliveries, 'autre livraison', 'autres livraisons')} aujourd’hui`
              : `${plural(moreDeliveries, 'livraison prévue', 'livraisons prévues')} aujourd’hui`,
            dot: TONE.green,
            section: 'projets' as SectionId,
          },
        ]
      : []),
    ...cal.items.map((e, i) => ({
      key: `e-${i}`,
      text: e.title,
      sub: e.meta,
      dot: e.dot,
      to: e.to,
    })),
    ...(moreEvents
      ? [
          {
            key: 'e-more',
            text: `${plural(moreEvents, 'autre évènement', 'autres évènements')} aujourd’hui`,
            dot: TONE.sky,
            to: '/admin/calendar',
          },
        ]
      : []),
  ];

  const nextDelivery =
    !deliveryCount &&
    data.kpis.nextDelivery &&
    data.kpis.nextDelivery !== 'Aucune'
      ? `${data.kpis.nextDelivery}${data.kpis.nextDeliveryIn ? `, ${data.kpis.nextDeliveryIn}` : ''}`
      : null;

  const lead =
    urgent.length && pending.length
      ? `${plural(urgent.length, 'urgence', 'urgences')}, puis ${plural(pending.length, 'chose', 'choses')} à traiter.`
      : urgent.length
        ? `${plural(urgent.length, 'urgence', 'urgences')} à traiter en priorité.`
        : pending.length
          ? `Rien d’urgent : ${plural(pending.length, 'chose', 'choses')} à traiter.`
          : 'Journée calme : rien d’urgent, rien en attente.';

  return {
    dateLabel: cap(d.format('dddd D MMMM')),
    greeting: `${d.hour() >= 18 ? 'Bonsoir' : 'Bonjour'}${firstName ? ` ${firstName}` : ''}`,
    lead,
    urgent,
    todo,
    today,
    news: newsText(news),
    nextDelivery,
    memo: {
      items: sections.accueil.items.map((it) => it.title),
      count: Number(sections.accueil.badge) || 0,
    },
    topProject: data.projects[0] ?? null,
    steps: steps.length,
  };
};
