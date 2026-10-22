// Traduit les données brutes (lectures Strapi / peg-backend) en ce que montre
// le village : pastilles, filtres, phrases, chiffres et projets mis en avant.
// Fonctions pures, testées : une lecture absente (échec) donne une rubrique
// sans pastille et « Données indisponibles », jamais un faux zéro.
import dayjs from 'dayjs';
import type { Project } from '@/@types/project';
import { statusTextData } from '@/views/app/common/projects/lists/constants';
import {
  projectCoverUrl,
  projectProgress,
} from '@/views/app/common/projects/details/utils';
import type { VillageFilter } from './VillageMap';
import { MENU_ORDER, type SectionId } from './villageScene';
import {
  TONE,
  emptySection,
  plural,
  type ActivityInfo,
  type DayDelivery,
  type ProjectCard,
  type SeriesPoint,
  type SectionData,
  type SectionItem,
  type Trend,
  type TrendKey,
  type VillageData,
} from './villageModel';

// ── Données brutes ───────────────────────────────────────────────────────────

export interface RawProject {
  documentId: string;
  name: string;
  state: string;
  endDate?: string | null;
  createdAt?: string | null;
  /** Projets livrés : date de passage en « Terminé » (à peu près). */
  updatedAt?: string | null;
  customer?: { name?: string | null } | null;
  images?: { url: string }[] | null;
  checklistItems?: { done: boolean }[] | null;
  tasks?: { state: string }[] | null;
  orderItem?: {
    batStatus?: string | null;
    sizeAndColorSelections?: { quantity?: number }[] | null;
    product?: {
      name?: string | null;
      requiresBat?: boolean | null;
      images?: { url: string }[] | null;
      batFile?: { url?: string | null } | null;
    } | null;
  } | null;
}

export interface RawInvoice {
  documentId: string;
  name?: string | null;
  totalAmount?: number | null;
  date?: string | null;
  dueDate?: string | null;
  paymentState?: string | null;
  customer?: { name?: string | null } | null;
}

export interface RawTicket {
  createdAt?: string | null;
  /** Champ JSON Strapi : fil des messages, du plus ancien au plus récent. */
  messages?: unknown;
}

type TicketMessage = { createdByRole?: string; createdAt?: string };

const ticketMessages = (t: RawTicket): TicketMessage[] => {
  let m = t.messages;
  if (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch {
      m = [];
    }
  }
  return Array.isArray(m) ? (m as TicketMessage[]) : [];
};

/**
 * Depuis quand un ticket ouvert attend PEG : null si le dernier message vient
 * de l'équipe ; sinon depuis le premier message du client qui suit la
 * dernière réponse de l'équipe (ou depuis l'ouverture du ticket).
 */
export const ticketWaitingSince = (t: RawTicket): string | null => {
  const msgs = ticketMessages(t);
  if (msgs.length && msgs[msgs.length - 1].createdByRole === 'admin')
    return null;
  let lastAdmin = -1;
  msgs.forEach((m, i) => {
    if (m.createdByRole === 'admin') lastAdmin = i;
  });
  return lastAdmin >= 0
    ? (msgs[lastAdmin + 1]?.createdAt ?? null)
    : (t.createdAt ?? msgs[0]?.createdAt ?? null);
};

/** Tickets sans réponse de PEG depuis plus de 48 h. */
export const staleTickets = (tickets: RawTicket[], now: Date) => {
  const cutoff = dayjs(now).subtract(48, 'hour');
  return tickets.filter((t) => {
    const since = ticketWaitingSince(t);
    return !!since && dayjs(since).isBefore(cutoff);
  }).length;
};

export interface RawEvent {
  title: string;
  startDate: string;
  category?: string | null;
  allDay?: boolean | null;
  recurrence?: string | null;
  recurrenceEnd?: string | null;
}

type N = number | null;

export interface RawVillage {
  projects?: {
    pending: N;
    pendingPaid: N;
    waiting: N;
    sav: N;
    late: N;
    next: RawProject | null;
    /** Projets actifs dont la livraison est prévue aujourd'hui. */
    dueToday?: N;
    /** Les premiers de ces projets, nommés (fiche « Ma journée »). */
    todayList?: RawProject[];
    /** Livraisons prévues chacun des 7 prochains jours (aujourd'hui en premier). */
    dueNext7?: number[];
  };
  samples?: RawProject[];
  /** Activité des 30 derniers jours et des 3 périodes précédentes (serveur). */
  activity?: Partial<
    Record<SectionId, { current: number; previous: number[] }>
  >;
  /** Photo des chiffres d'un jour précédent (serveur), pour les tendances. */
  trends?: { since: string; values: Partial<Record<TrendKey, number>> } | null;
  /** Photos des 13 jours précédents (serveur), pour les petites courbes. */
  history?: { day: string; values: Partial<Record<TrendKey, number>> }[];
  /** Projets dont le produit exige un BAT et dont le BAT n'est pas validé. */
  batCandidates?: RawProject[];
  /** requestedStale : demandes de devis sans réponse depuis 48 h. */
  quotes?: { proposed: N; requested: N; requestedStale?: N };
  /** stale : tickets ouverts sans activité depuis 48 h. */
  tickets?: { open: N; stale?: N };
  customers?: { total: N; newMonth: N; subscribers: N; toProcess: N };
  producers?: { total: N };
  shop?: {
    ordersToday: N;
    ordersPending: N;
    productsActive: N;
    promoUsable: N;
  };
  attributes?: { sizes: N; colors: N; forms: N; checklists: N };
  banners?: { active: N };
  users?: { total: N; unconfirmed: N };
  invoices?: { unpaid: RawInvoice[]; total: N };
  calendar?: RawEvent[];
  planning?: {
    overloaded: { name: string; totalDays: number; capacityDays: number }[];
    loads: {
      name: string;
      totalDays: number;
      capacityDays: number;
      projectCount: number;
    }[];
    late: number;
    tight: number;
  };
  leads?: { toCall: N; newMonth: N };
  generators?: {
    pendingCount: number;
    pendingAmount: number;
    payoutRequests: number;
    autoValidate: boolean;
  };
  campaigns?: {
    scheduled: { title: string; sendAt: string | null }[];
    sentLast30Days: N;
  };
  ia?: { conversationsToday: N; relecteurEnabled: boolean | null; proposed: N };
  imbretex?: { productCount: N; variantCount: N };
  todos?: { text: string; done: boolean }[];
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

const ACTIVE = ['pending', 'pending_paid', 'waiting'];
const UNAVAILABLE = 'Données indisponibles';
const num = (n: N | undefined) => (typeof n === 'number' ? n : null);
const show = (n: N | undefined) => (typeof n === 'number' ? String(n) : '—');
const fmtDay = (d: string | Date) => dayjs(d).format('D MMMM');

export const eur = (n: number, hidden: boolean) => {
  if (hidden) return '•••••';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n)} €`;
  }
};

/** Le BAT a été déposé et attend la réponse du client. */
export const batAwaitingClient = (p: RawProject) =>
  !!p.orderItem?.product?.requiresBat &&
  !!p.orderItem?.product?.batFile?.url &&
  (p.orderItem?.batStatus == null || p.orderItem?.batStatus === 'pending');

export const isLate = (p: RawProject, now: Date) =>
  ACTIVE.includes(p.state) &&
  !!p.endDate &&
  dayjs(p.endDate).isBefore(dayjs(now).startOf('day'));

/** Une occurrence de l'évènement tombe-t-elle ce jour-là ? (récurrences comprises) */
export const occursOn = (e: RawEvent, day: Date) => {
  const start = dayjs(e.startDate);
  const d = dayjs(day);
  if (!start.isValid() || start.isAfter(d.endOf('day'))) return false;
  if (start.isSame(d, 'day')) return true;
  if (e.recurrenceEnd && dayjs(e.recurrenceEnd).isBefore(d.startOf('day')))
    return false;
  switch (e.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return start.day() === d.day();
    case 'monthly':
      return start.date() === d.date();
    case 'yearly':
      return start.date() === d.date() && start.month() === d.month();
    default:
      return false;
  }
};

const quantityOf = (p: RawProject) =>
  (p.orderItem?.sizeAndColorSelections ?? []).reduce(
    (s, x) => s + (Number(x?.quantity) || 0),
    0
  );

// ── Tendances ────────────────────────────────────────────────────────────────

/** Mêmes chiffres que la photo quotidienne du serveur (village-summary.ts). */
export const currentSnapshot = (
  raw: RawVillage,
  now: Date
): Partial<Record<TrendKey, number>> => {
  const v: Partial<Record<TrendKey, number>> = {};
  const set = (k: TrendKey, n: unknown) => {
    if (typeof n === 'number' && Number.isFinite(n)) v[k] = n;
  };
  const pr = raw.projects;
  if (pr) {
    if (typeof pr.pending === 'number' && typeof pr.pendingPaid === 'number')
      set('projectsInProgress', pr.pending + pr.pendingPaid);
    set('projectsLate', pr.late);
  }
  if (raw.batCandidates)
    set('batToValidate', raw.batCandidates.filter(batAwaitingClient).length);
  if (raw.invoices) {
    const due = (i: RawInvoice) => i.dueDate || i.date;
    const dayStart = dayjs(now).startOf('day');
    set(
      'overdueInvoices',
      raw.invoices.unpaid.filter(
        (i) => due(i) && dayjs(due(i) as string).isBefore(dayStart)
      ).length
    );
    set(
      'unpaidTotal',
      Math.round(
        raw.invoices.unpaid.reduce(
          (sum, i) => sum + (Number(i.totalAmount) || 0),
          0
        )
      )
    );
  }
  set('ticketsOpen', raw.tickets?.open);
  set('quotesRequested', raw.quotes?.requested);
  set('customers', raw.customers?.total);
  set('leadsToCall', raw.leads?.toCall);
  set('ordersPending', raw.shop?.ordersPending);
  set('productsActive', raw.shop?.productsActive);
  set('commissionsPending', raw.generators?.pendingCount);
  return v;
};

/** « depuis hier », « en 7 jours », « depuis le 14 octobre ». */
export const sinceLabel = (since: string, now: Date) => {
  const days = dayjs(now).startOf('day').diff(dayjs(since), 'day');
  if (days <= 1) return 'depuis hier';
  if (days === 7) return 'en 7 jours';
  return `depuis le ${fmtDay(since)}`;
};

/**
 * Évolution d'un chiffre. good : sens favorable (« down » pour les retards,
 * « up » pour les clients) ; null si l'un des deux chiffres manque.
 */
export const trendOf = (
  current: number | undefined,
  past: number | undefined,
  good: 'up' | 'down' | 'neutral',
  since: string,
  format: (n: number) => string = (n) => String(n)
): Trend | null => {
  if (typeof current !== 'number' || typeof past !== 'number') return null;
  const delta = current - past;
  const tone: Trend['tone'] =
    delta === 0 || good === 'neutral'
      ? 'neutral'
      : delta > 0 === (good === 'up')
        ? 'good'
        : 'bad';
  return {
    delta,
    text:
      delta === 0 ? '=' : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))}`,
    tone,
    since,
  };
};

/** Chiffres de fiche suivis : [rubrique, libellé du chiffre, clé, sens favorable]. */
const STAT_TRENDS: [SectionId, string, TrendKey, 'up' | 'down' | 'neutral'][] =
  [
    ['projets', 'En cours', 'projectsInProgress', 'up'],
    ['projets', 'BAT à valider', 'batToValidate', 'down'],
    ['projets', 'En retard', 'projectsLate', 'down'],
    ['devis', 'À préparer', 'quotesRequested', 'neutral'],
    ['leads', 'À rappeler', 'leadsToCall', 'down'],
    ['clients', 'Clients', 'customers', 'up'],
    ['boutique', 'En cours', 'ordersPending', 'neutral'],
    ['boutique', 'Produits actifs', 'productsActive', 'neutral'],
    ['finance', 'Reste à encaisser TTC', 'unpaidTotal', 'down'],
    ['finance', 'En retard', 'overdueInvoices', 'down'],
    ['generateurs', 'Commissions en attente', 'commissionsPending', 'neutral'],
    ['tickets', 'Ouverts', 'ticketsOpen', 'down'],
  ];

// ── Petites courbes ──────────────────────────────────────────────────────────

const ymd = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

/**
 * Les 7 derniers jours d'un chiffre : photos des jours précédents, chiffre en
 * direct pour aujourd'hui ; null si la photo d'un jour manque. Rien (null) tant
 * qu'il y a moins de deux points.
 */
export const pastSeries = (
  history: RawVillage['history'],
  key: TrendKey,
  current: number | undefined,
  now: Date
): SeriesPoint[] | null => {
  const today = dayjs(now).startOf('day');
  const byDay = new Map((history ?? []).map((h) => [h.day, h.values[key]]));
  const points: SeriesPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = today.subtract(6 - i, 'day');
    const v = i === 6 ? current : byDay.get(ymd(day));
    return { day: ymd(day), value: typeof v === 'number' ? v : null };
  });
  return points.filter((p) => p.value !== null).length >= 2 ? points : null;
};

/** Nombre de dates tombant chacun des `days` jours à partir d'aujourd'hui. */
export const bucketByDay = (
  dates: (string | null | undefined)[],
  now: Date,
  days = 7
): number[] => {
  const start = dayjs(now).startOf('day');
  const out = new Array(days).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const i = dayjs(d).startOf('day').diff(start, 'day');
    if (i >= 0 && i < days) out[i] += 1;
  }
  return out;
};

/**
 * Livraisons des 7 prochains jours : projets à livrer (serveur ou lecture du
 * navigateur) ou livraisons du calendrier, le plus grand des deux chaque jour
 * (une même livraison est souvent notée aux deux endroits). Sans le compte
 * des projets (serveur pas encore à jour, lecture en échec), pas de barres :
 * le calendrier seul afficherait de faux zéros.
 */
export const deliverySeries = (
  dueNext7: number[] | undefined,
  calendar: RawEvent[] | undefined,
  now: Date
): SeriesPoint[] | null => {
  if (!dueNext7 || dueNext7.length < 7) return null;
  const today = dayjs(now).startOf('day');
  return Array.from({ length: 7 }, (_, i) => {
    const day = today.add(i, 'day');
    const fromCalendar = (calendar ?? []).filter(
      (e) => e.category === 'livraison' && occursOn(e, day.toDate())
    ).length;
    return {
      day: ymd(day),
      value: Math.max(dueNext7?.[i] ?? 0, fromCalendar),
    };
  });
};

// ── Activité du mois : bâtiments qui grandissent ─────────────────────────────

/** Niveau d'activité : les 30 derniers jours face à la moyenne des 3 périodes d'avant. */
export const activityLevel = (
  current: number,
  previous: number[]
): ActivityInfo['level'] => {
  const prev = previous.filter((n) => Number.isFinite(n));
  const avg = prev.length ? prev.reduce((a, n) => a + n, 0) / prev.length : 0;
  if (!(current > 0)) return 0;
  const ratio = current / Math.max(avg, 1);
  if (ratio >= 1.5 && current >= 5) return 3;
  if (ratio >= 1.1) return 2;
  if (ratio >= 0.75) return 1;
  return 0;
};

const LEVEL_LABEL: Record<ActivityInfo['level'], string> = {
  0: 'Plus calme que d’habitude',
  1: 'Dans la moyenne',
  2: 'En hausse',
  3: 'Exceptionnel',
};

/** Ce que compte l'activité de chaque bâtiment suivi (singulier, pluriel). */
const ACTIVITY_UNIT: Partial<Record<SectionId, [string, string]>> = {
  projets: ['projet créé', 'projets créés'],
  boutique: ['commande payée', 'commandes payées'],
  finance: ['facturé TTC', 'facturés TTC'],
  devis: ['demande de devis', 'demandes de devis'],
  clients: ['nouveau client', 'nouveaux clients'],
  leads: ['nouveau lead', 'nouveaux leads'],
  premium: ['nouvel abonné', 'nouveaux abonnés'],
  generateurs: ['commission', 'commissions'],
  campagnes: ['campagne envoyée', 'campagnes envoyées'],
  ia: ['conversation', 'conversations'],
};

export const activityInfo = (
  id: SectionId,
  a: { current: number; previous: number[] } | undefined,
  hidden: boolean
): ActivityInfo | null => {
  const unit = ACTIVITY_UNIT[id];
  if (!unit || !a || typeof a.current !== 'number') return null;
  const level = activityLevel(a.current, a.previous ?? []);
  const prev = (a.previous ?? []).filter((n) => Number.isFinite(n));
  const avg = prev.length
    ? Math.round(prev.reduce((x, n) => x + n, 0) / prev.length)
    : 0;
  const money = id === 'finance';
  const fmt = (n: number) => (money ? eur(n, hidden) : String(n));
  const what = money ? unit[0] : a.current > 1 ? unit[1] : unit[0];
  return {
    level,
    label: LEVEL_LABEL[level],
    text: `${fmt(a.current)} ${what} en 30 jours (moyenne ${fmt(avg)})`,
  };
};

// ── Projets mis en avant ─────────────────────────────────────────────────────

export const projectCard = (
  p: RawProject,
  bat: Set<string>,
  now: Date
): ProjectCard => {
  const late = isLate(p, now);
  const awaitingBat = bat.has(p.documentId);
  const product = p.orderItem?.product?.name;
  const qty = quantityOf(p);
  const progress = projectProgress(p as unknown as Project).percent;
  const needsBat = !!p.orderItem?.product?.requiresBat;
  const chipTone: ProjectCard['chipTone'] = late
    ? 'late'
    : awaitingBat
      ? 'bat'
      : p.state === 'pending_paid'
        ? 'paid'
        : p.state === 'waiting'
          ? 'waiting'
          : 'production';
  const chip = late
    ? 'En retard'
    : awaitingBat
      ? 'BAT à valider'
      : (statusTextData[p.state as keyof typeof statusTextData] ?? 'En cours');

  const steps: ProjectCard['steps'] = [
    {
      title: 'Projet créé',
      sub: p.createdAt ? fmtDay(p.createdAt) : '—',
      state: 'done',
    },
  ];
  if (needsBat)
    steps.push({
      title: 'Validation du BAT',
      sub: awaitingBat
        ? 'En attente du client'
        : p.orderItem?.batStatus === 'approved'
          ? 'BAT validé'
          : p.orderItem?.batStatus === 'rejected'
            ? 'BAT refusé : à refaire'
            : 'BAT à déposer',
      state: p.orderItem?.batStatus === 'approved' ? 'done' : 'current',
    });
  const batDone = !needsBat || p.orderItem?.batStatus === 'approved';
  steps.push({
    title: 'En production',
    sub: batDone ? `Avancement ${progress} %` : 'À venir',
    state: !batDone
      ? 'todo'
      : late
        ? 'late'
        : progress >= 100
          ? 'done'
          : 'current',
  });
  steps.push({
    title: 'Livraison',
    sub: late
      ? `Date dépassée depuis le ${fmtDay(p.endDate as string)}`
      : p.endDate
        ? `Prévue le ${fmtDay(p.endDate)}`
        : 'Date non fixée',
    state: 'todo',
  });

  return {
    documentId: p.documentId,
    name: p.name,
    customer: p.customer?.name || 'Client non renseigné',
    chip,
    chipTone,
    detail: product
      ? `${qty ? `${qty} × ` : ''}${product}`
      : 'Projet sur mesure',
    steps,
    dateLabel: late ? 'Livraison dépassée' : 'Livraison prévue',
    date: p.endDate ? fmtDay(p.endDate) : 'Non fixée',
    late,
    imageUrl: projectCoverUrl(p as unknown as Project),
  };
};

/** Le plus urgent d'abord : en retard, puis BAT en attente, puis date la plus proche. */
export const rankProjects = (list: RawProject[], bat: Set<string>, now: Date) =>
  [...list].sort((a, b) => {
    const score = (p: RawProject) =>
      (isLate(p, now) ? 0 : bat.has(p.documentId) ? 1 : 2) * 1e13 +
      (p.endDate ? new Date(p.endDate).getTime() : 9e12);
    return score(a) - score(b);
  });

// ── Rubriques ────────────────────────────────────────────────────────────────

const section = (
  partial: Partial<SectionData> & { chip: string }
): SectionData => ({
  ...emptySection(partial.chip),
  lead: partial.chip,
  ...partial,
});

const tags = (...pairs: [VillageFilter, boolean][]) =>
  pairs.filter(([, on]) => on).map(([t]) => t);

export const buildVillageData = (
  raw: RawVillage,
  now: Date,
  hidden: boolean
): VillageData => {
  const s = {} as Record<SectionId, SectionData>;
  const today = dayjs(now);

  // Projets et BAT
  const bat = new Set(
    (raw.batCandidates ?? []).filter(batAwaitingClient).map((p) => p.documentId)
  );
  const batCount = raw.batCandidates ? bat.size : null;
  const pr = raw.projects;
  const inProgress =
    pr && pr.pending !== null && pr.pendingPaid !== null
      ? pr.pending + pr.pendingPaid
      : null;
  const ranked = rankProjects(
    [
      ...(raw.samples ?? []),
      ...(raw.batCandidates ?? []).filter((p) => bat.has(p.documentId)),
    ].filter(
      (p, i, all) => all.findIndex((q) => q.documentId === p.documentId) === i
    ),
    bat,
    now
  );
  const projects = ranked.slice(0, 6).map((p) => projectCard(p, bat, now));
  const nextDelivery = pr?.next?.endDate ?? null;
  const soon =
    !!nextDelivery &&
    dayjs(nextDelivery).diff(today.startOf('day'), 'day') <= 7;

  s.projets = !pr
    ? emptySection(UNAVAILABLE)
    : section({
        badge: inProgress ? String(inProgress) : null,
        tone: TONE.violet,
        tags: tags(
          ['urgent', (num(pr.late) ?? 0) > 0],
          ['traiter', (num(pr.late) ?? 0) > 0 || (batCount ?? 0) > 0],
          ['production', (inProgress ?? 0) > 0],
          ['livrer', soon]
        ),
        attention: (num(pr.late) ?? 0) > 0 || (batCount ?? 0) > 0,
        alert: pr.late
          ? pr.late === 1
            ? '1 projet a dépassé sa date de livraison.'
            : `${pr.late} projets ont dépassé leur date de livraison.`
          : null,
        chip:
          inProgress === null
            ? UNAVAILABLE
            : inProgress
              ? `${plural(inProgress, 'projet')} en cours`
              : 'Aucun projet en cours',
        lead: pr.late
          ? pr.late === 1
            ? '1 projet a dépassé sa date de livraison.'
            : `${pr.late} projets ont dépassé leur date de livraison.`
          : batCount
            ? `${plural(batCount, 'BAT attend', 'BAT attendent')} la validation du client.`
            : 'Aucun projet en retard.',
        stats: [
          { label: 'En cours', value: show(inProgress) },
          { label: 'BAT à valider', value: show(batCount) },
          { label: 'En retard', value: show(pr.late) },
          { label: 'En attente', value: show(pr.waiting) },
        ],
        items: projects.slice(0, 3).map((p) => ({
          title: p.name,
          meta: `${p.customer} · ${p.chip.toLowerCase()}`,
          dot:
            p.chipTone === 'late'
              ? TONE.red
              : p.chipTone === 'bat'
                ? TONE.violet
                : TONE.orange,
          projectId: p.documentId,
        })),
      });

  // Calendrier
  if (!raw.calendar) s.calendrier = emptySection(UNAVAILABLE);
  else {
    const todays = raw.calendar
      .filter((e) => occursOn(e, now))
      .sort(
        (a, b) =>
          dayjs(a.startDate).hour() * 60 +
          dayjs(a.startDate).minute() -
          (dayjs(b.startDate).hour() * 60 + dayjs(b.startDate).minute())
      );
    const week = Array.from({ length: 7 }, (_, i) =>
      today.add(i, 'day').toDate()
    );
    const deliveries = raw.calendar.filter(
      (e) => e.category === 'livraison' && week.some((d) => occursOn(e, d))
    ).length;
    s.calendrier = section({
      badge: todays.length ? String(todays.length) : null,
      tone: TONE.sky,
      tags: tags(['livrer', deliveries > 0]),
      chip: todays.length
        ? `${plural(todays.length, 'évènement')} aujourd’hui`
        : 'Aucun évènement aujourd’hui',
      lead: deliveries
        ? `${plural(deliveries, 'livraison prévue', 'livraisons prévues')} dans les 7 jours.`
        : 'Aucune livraison prévue dans les 7 jours.',
      stats: [
        { label: 'Aujourd’hui', value: String(todays.length) },
        { label: 'Livraisons sur 7 jours', value: String(deliveries) },
      ],
      items: todays.slice(0, 3).map((e) => ({
        title: e.allDay
          ? e.title
          : `${dayjs(e.startDate).format('HH:mm')} · ${e.title}`,
        meta:
          e.category === 'livraison'
            ? 'Livraison'
            : e.category === 'reunion'
              ? 'Réunion'
              : e.category === 'production'
                ? 'Production'
                : 'Évènement',
        dot: e.category === 'livraison' ? TONE.green : TONE.sky,
        to: '/admin/calendar',
      })),
    });
  }

  // Planning
  const pl = raw.planning;
  s.planning = !pl
    ? emptySection(UNAVAILABLE)
    : section({
        badge: pl.overloaded.length ? String(pl.overloaded.length) : null,
        tone: TONE.orange,
        tags: tags(
          ['traiter', pl.overloaded.length > 0],
          ['production', pl.loads.length > 0]
        ),
        attention: pl.overloaded.length > 0,
        chip: pl.overloaded.length
          ? `${plural(pl.overloaded.length, 'producteur surchargé', 'producteurs surchargés')}`
          : 'Charge équilibrée',
        lead: pl.late
          ? pl.late === 1
            ? '1 projet ne tiendra pas sa date au rythme actuel.'
            : `${pl.late} projets ne tiendront pas leur date au rythme actuel.`
          : 'Les dates tiennent au rythme actuel.',
        stats: [
          {
            label: 'Surchargés (2 semaines)',
            value: String(pl.overloaded.length),
          },
          { label: 'Projets en retard', value: String(pl.late) },
          { label: 'Projets serrés', value: String(pl.tight) },
          { label: 'Producteurs occupés', value: String(pl.loads.length) },
        ],
        items: pl.loads.slice(0, 3).map((l) => ({
          title: l.name,
          meta: `${l.totalDays} j de travail pour ${l.capacityDays} j disponibles`,
          dot: l.totalDays > l.capacityDays ? TONE.red : TONE.green,
          to: '/admin/planning',
        })),
      });

  // Devis : la pastille suit celle du menu (demandes à préparer).
  const q = raw.quotes;
  s.devis = !q
    ? emptySection(UNAVAILABLE)
    : section({
        badge: q.requested ? String(q.requested) : null,
        tone: TONE.amber,
        tags: tags(
          ['urgent', (q.requestedStale ?? 0) > 0],
          ['traiter', (q.requested ?? 0) > 0]
        ),
        attention: (q.requested ?? 0) > 0,
        alert: q.requestedStale
          ? q.requestedStale === 1
            ? '1 demande de devis sans réponse depuis 48 h.'
            : `${q.requestedStale} demandes de devis sans réponse depuis 48 h.`
          : null,
        chip: q.requested
          ? `${plural(q.requested, 'devis', 'devis')} à préparer`
          : q.proposed
            ? `${plural(q.proposed, 'devis', 'devis')} en attente du client`
            : 'Aucun devis en attente',
        lead: q.requested
          ? q.requested === 1
            ? '1 demande de devis attend votre réponse.'
            : `${q.requested} demandes de devis attendent votre réponse.`
          : q.proposed
            ? q.proposed === 1
              ? '1 devis attend la réponse du client.'
              : `${q.proposed} devis attendent la réponse du client.`
            : 'Aucun devis en attente.',
        stats: [
          { label: 'À préparer', value: show(q.requested) },
          { label: 'En attente du client', value: show(q.proposed) },
        ],
      });

  // Leads
  const ld = raw.leads;
  s.leads = !ld
    ? emptySection(UNAVAILABLE)
    : section({
        badge: ld.toCall ? String(ld.toCall) : null,
        tone: TONE.amber,
        tags: tags(['traiter', (ld.toCall ?? 0) > 0]),
        attention: (ld.toCall ?? 0) > 0,
        chip: ld.toCall
          ? `${plural(ld.toCall, 'lead')} à rappeler`
          : 'Aucun lead à rappeler',
        lead:
          ld.newMonth !== null
            ? `${plural(ld.newMonth, 'nouveau lead', 'nouveaux leads')} ce mois-ci.`
            : 'Leads à recontacter.',
        stats: [
          { label: 'À rappeler', value: show(ld.toCall) },
          { label: 'Nouveaux ce mois', value: show(ld.newMonth) },
        ],
      });

  // Clients et Premium
  const cu = raw.customers;
  s.clients = !cu
    ? emptySection(UNAVAILABLE)
    : section({
        badge: cu.newMonth ? `+${cu.newMonth}` : null,
        tone: TONE.green,
        chip: cu.newMonth
          ? `${plural(cu.newMonth, 'nouveau', 'nouveaux')} ce mois-ci`
          : 'Aucun nouveau client ce mois-ci',
        lead:
          cu.total !== null
            ? `${plural(cu.total, 'client')}${cu.subscribers ? `, dont ${plural(cu.subscribers, 'abonné Premium', 'abonnés Premium')}` : ''}.`
            : UNAVAILABLE,
        stats: [
          { label: 'Clients', value: show(cu.total) },
          { label: 'Nouveaux ce mois', value: show(cu.newMonth) },
          { label: 'Abonnés Premium', value: show(cu.subscribers) },
        ],
      });
  s.premium = !cu
    ? emptySection(UNAVAILABLE)
    : section({
        badge: cu.toProcess ? String(cu.toProcess) : null,
        tone: TONE.amber,
        tags: tags(['traiter', (cu.toProcess ?? 0) > 0]),
        attention: (cu.toProcess ?? 0) > 0,
        chip: cu.toProcess ? `${cu.toProcess} à traiter` : 'Tout est traité',
        lead: cu.toProcess
          ? cu.toProcess === 1
            ? '1 client Premium attend ses offres personnalisées.'
            : `${cu.toProcess} clients Premium attendent leurs offres personnalisées.`
          : 'Les offres personnalisées sont prêtes.',
        stats: [
          { label: 'Abonnés Premium', value: show(cu.subscribers) },
          { label: 'À traiter', value: show(cu.toProcess) },
        ],
      });

  // Générateurs : commissions à valider (sauf validation automatique) et
  // demandes de versement (la pastille du menu ne compte que ces dernières).
  const g = raw.generators;
  const toValidate = g && !g.autoValidate ? g.pendingCount : 0;
  const gCount = g ? toValidate + g.payoutRequests : 0;
  s.generateurs = !g
    ? emptySection(UNAVAILABLE)
    : section({
        badge: gCount ? String(gCount) : null,
        tone: TONE.amber,
        tags: tags(['traiter', gCount > 0]),
        attention: gCount > 0,
        chip:
          [
            toValidate ? `${plural(toValidate, 'commission')} à valider` : '',
            g.payoutRequests
              ? `${plural(g.payoutRequests, 'demande', 'demandes')} de versement`
              : '',
          ]
            .filter(Boolean)
            .join(' · ') || 'Rien à traiter',
        lead: g.pendingCount
          ? `${eur(g.pendingAmount, hidden)} de commissions en attente.`
          : 'Les commissions sont à jour.',
        stats: [
          { label: 'Commissions en attente', value: String(g.pendingCount) },
          { label: 'Montant', value: eur(g.pendingAmount, hidden) },
          { label: 'Demandes de versement', value: String(g.payoutRequests) },
        ],
      });

  // Producteurs
  s.producteurs = !raw.producers
    ? emptySection(UNAVAILABLE)
    : section({
        tags: tags(['production', (pl?.loads.length ?? 0) > 0]),
        chip:
          raw.producers.total !== null
            ? plural(raw.producers.total, 'producteur')
            : UNAVAILABLE,
        lead: pl
          ? `${plural(pl.loads.filter((l) => l.name !== 'Non assigné').length, 'producteur a', 'producteurs ont')} des projets en cours.`
          : 'Liste des producteurs.',
        stats: [{ label: 'Producteurs', value: show(raw.producers.total) }],
      });

  // Boutique
  const sh = raw.shop;
  s.boutique = !sh
    ? emptySection(UNAVAILABLE)
    : section({
        badge: sh.ordersToday ? String(sh.ordersToday) : null,
        tone: TONE.violet,
        tags: tags(['livrer', (sh.ordersPending ?? 0) > 0]),
        chip: sh.ordersToday
          ? `${plural(sh.ordersToday, 'commande')} aujourd’hui`
          : 'Aucune commande aujourd’hui',
        lead: sh.ordersPending
          ? `${plural(sh.ordersPending, 'commande', 'commandes')} en cours de traitement.`
          : 'Aucune commande en cours.',
        stats: [
          { label: 'Aujourd’hui', value: show(sh.ordersToday) },
          { label: 'En cours', value: show(sh.ordersPending) },
          { label: 'Produits actifs', value: show(sh.productsActive) },
          { label: 'Codes promo actifs', value: show(sh.promoUsable) },
        ],
      });

  // Attributs
  const at = raw.attributes;
  s.attributs = !at
    ? emptySection(UNAVAILABLE)
    : section({
        chip: `${show(at.sizes)} tailles · ${show(at.colors)} couleurs`,
        lead: `${show(at.forms)} formulaires et ${show(at.checklists)} checklists.`,
        stats: [
          { label: 'Tailles', value: show(at.sizes) },
          { label: 'Couleurs', value: show(at.colors) },
          { label: 'Formulaires', value: show(at.forms) },
          { label: 'Checklists', value: show(at.checklists) },
        ],
      });

  // Fournisseurs
  const im = raw.imbretex;
  s.fournisseurs = !im
    ? emptySection('Catalogue Imbretex')
    : section({
        chip:
          im.productCount !== null
            ? `${im.productCount} produits Imbretex`
            : 'Catalogue Imbretex',
        lead: 'Catalogue fournisseur, réservé à l’équipe PEG.',
        stats: [
          { label: 'Produits', value: show(im.productCount) },
          { label: 'Variantes', value: show(im.variantCount) },
        ],
      });

  // Finance
  const inv = raw.invoices;
  let overdueCount: number | null = null;
  if (!inv) s.finance = emptySection(UNAVAILABLE);
  else {
    const due = (i: RawInvoice) => i.dueDate || i.date;
    const overdue = inv.unpaid.filter(
      (i) => due(i) && dayjs(due(i) as string).isBefore(today.startOf('day'))
    );
    overdueCount = overdue.length;
    const longOverdue = overdue.filter((i) =>
      dayjs(due(i) as string).isBefore(today.startOf('day').subtract(30, 'day'))
    ).length;
    const toConfirm = inv.unpaid.filter(
      (i) => i.paymentState === 'pending_transfer'
    ).length;
    const rest = inv.unpaid.reduce(
      (sum, i) => sum + (Number(i.totalAmount) || 0),
      0
    );
    const items: SectionItem[] = overdue.slice(0, 3).map((i) => ({
      title: `${i.name || 'Facture'} · ${eur(Number(i.totalAmount) || 0, hidden)} TTC`,
      meta: `${i.customer?.name || 'Client'} · en retard de ${plural(today.startOf('day').diff(dayjs(due(i) as string).startOf('day'), 'day'), 'jour')}`,
      dot: TONE.red,
      to: '/admin/invoices',
    }));
    s.finance = section({
      badge: overdue.length ? String(overdue.length) : null,
      tone: TONE.orange,
      tags: tags(
        ['urgent', longOverdue > 0],
        ['traiter', overdue.length > 0 || toConfirm > 0]
      ),
      attention: overdue.length > 0 || toConfirm > 0,
      alert: longOverdue
        ? longOverdue === 1
          ? '1 facture impayée depuis plus de 30 jours.'
          : `${longOverdue} factures impayées depuis plus de 30 jours.`
        : null,
      chip: overdue.length
        ? `${plural(overdue.length, 'facture')} en retard`
        : 'Aucune facture en retard',
      lead: inv.unpaid.length
        ? `${eur(rest, hidden)} TTC restent à encaisser.`
        : 'Toutes les factures sont réglées.',
      stats: [
        { label: 'Factures à régler', value: String(inv.unpaid.length) },
        { label: 'Reste à encaisser TTC', value: eur(rest, hidden) },
        { label: 'En retard', value: String(overdue.length) },
        { label: 'Virements à confirmer', value: String(toConfirm) },
      ],
      items,
    });
  }

  // Bannières
  s.bannieres = !raw.banners
    ? emptySection(UNAVAILABLE)
    : section({
        chip:
          raw.banners.active !== null
            ? plural(raw.banners.active, 'bannière active', 'bannières actives')
            : UNAVAILABLE,
        lead:
          raw.banners.active !== null
            ? `${plural(raw.banners.active, 'bannière s’affiche', 'bannières s’affichent')} dans les espaces clients.`
            : 'Bannières des espaces clients.',
        stats: [{ label: 'Actives', value: show(raw.banners.active) }],
      });

  // Campagnes
  const ca = raw.campaigns;
  if (!ca) s.campagnes = emptySection(UNAVAILABLE);
  else {
    const next = [...ca.scheduled].sort((a, b) =>
      String(a.sendAt).localeCompare(String(b.sendAt))
    )[0];
    s.campagnes = section({
      badge: ca.scheduled.length ? String(ca.scheduled.length) : null,
      tone: TONE.violet,
      chip: ca.scheduled.length
        ? `${plural(ca.scheduled.length, 'campagne programmée', 'campagnes programmées')}`
        : 'Aucune campagne programmée',
      lead: next
        ? `« ${next.title} » part le ${next.sendAt ? dayjs(next.sendAt).format('D MMMM [à] H[ h]mm').replace(' h00', ' h') : 'jour prévu'}.`
        : 'Notifications et e-mails aux clients.',
      stats: [
        { label: 'Programmées', value: String(ca.scheduled.length) },
        { label: 'Envoyées (30 jours)', value: show(ca.sentLast30Days) },
      ],
    });
  }

  // IA
  const ia = raw.ia;
  s.ia = !ia
    ? emptySection(UNAVAILABLE)
    : section({
        chip:
          ia.conversationsToday !== null
            ? `${plural(ia.conversationsToday, 'conversation')} aujourd’hui`
            : 'Chatbot',
        lead:
          ia.relecteurEnabled === null
            ? 'Chatbot, génération et agents.'
            : ia.relecteurEnabled
              ? 'Le relecteur des fiches produit est actif.'
              : 'Le relecteur des fiches produit est en pause.',
        stats: [
          {
            label: 'Conversations aujourd’hui',
            value: show(ia.conversationsToday),
          },
          { label: 'Corrections proposées', value: show(ia.proposed) },
        ],
      });

  // Utilisateurs
  const us = raw.users;
  s.utilisateurs = !us
    ? emptySection(UNAVAILABLE)
    : section({
        badge: us.unconfirmed ? String(us.unconfirmed) : null,
        tone: TONE.amber,
        tags: tags(['traiter', (us.unconfirmed ?? 0) > 0]),
        attention: (us.unconfirmed ?? 0) > 0,
        chip: us.unconfirmed
          ? `${plural(us.unconfirmed, 'compte non confirmé', 'comptes non confirmés')}`
          : 'Tous les comptes sont confirmés',
        lead: us.unconfirmed
          ? `${plural(us.unconfirmed, 'inscription attend', 'inscriptions attendent')} la confirmation de l’e-mail.`
          : 'Comptes et rôles.',
        stats: [
          { label: 'Utilisateurs', value: show(us.total) },
          { label: 'Non confirmés', value: show(us.unconfirmed) },
        ],
      });

  // Tickets
  const tk = raw.tickets;
  s.tickets = !tk
    ? emptySection(UNAVAILABLE)
    : section({
        badge: tk.open ? String(tk.open) : null,
        tone: TONE.orange,
        tags: tags(
          ['urgent', (tk.stale ?? 0) > 0],
          ['traiter', (tk.open ?? 0) > 0]
        ),
        attention: (tk.open ?? 0) > 0,
        alert: tk.stale
          ? tk.stale === 1
            ? '1 ticket sans réponse depuis 48 h.'
            : `${tk.stale} tickets sans réponse depuis 48 h.`
          : null,
        chip: tk.open
          ? `${plural(tk.open, 'ticket ouvert', 'tickets ouverts')}`
          : 'Aucun ticket ouvert',
        lead: tk.open
          ? `${plural(tk.open, 'ticket attend', 'tickets attendent')} une réponse.`
          : 'Aucune demande en attente.',
        stats: [{ label: 'Ouverts', value: show(tk.open) }],
      });

  // Paramètres
  s.parametres = section({
    chip: 'Profil, entreprise et paiements',
    lead: 'Réglages du compte et de l’entreprise.',
  });

  // Accueil : le pense-bête du tableau de bord classique
  const todos = raw.todos;
  if (!todos) s.accueil = emptySection('Bannière, pense-bête et widgets');
  else {
    const open = todos.filter((t) => !t.done);
    s.accueil = section({
      badge: open.length ? String(open.length) : null,
      tone: TONE.violet,
      tags: tags(['traiter', open.length > 0]),
      attention: open.length > 0,
      chip: open.length
        ? `Pense-bête : ${plural(open.length, 'tâche')} en cours`
        : 'Pense-bête à jour',
      lead: 'Bannière, pense-bête et widgets du tableau de bord classique.',
      items: open
        .slice(0, 3)
        .map((t) => ({ title: t.text, meta: 'Pense-bête', dot: TONE.violet })),
    });
  }

  for (const id of MENU_ORDER) if (!s[id]) s[id] = emptySection(UNAVAILABLE);

  // Tendances : chiffres d'aujourd'hui face à la photo d'un jour précédent
  const cur = currentSnapshot(raw, now);
  const past = raw.trends?.values ?? {};
  const since = raw.trends ? sinceLabel(raw.trends.since, now) : '';
  const trend = (
    k: TrendKey,
    good: 'up' | 'down' | 'neutral',
    money = false
  ) =>
    raw.trends
      ? trendOf(cur[k], past[k], good, since, (n) =>
          money ? eur(n, hidden) : String(n)
        )
      : null;
  for (const [id, label, k, good] of STAT_TRENDS) {
    const stat = s[id].stats.find((x) => x.label === label);
    const t = stat && trend(k, good, k === 'unpaidTotal');
    if (stat && t && t.delta !== 0) stat.trend = t;
  }
  const kpiTrends: VillageData['kpis']['trends'] = {};
  for (const [k, good] of [
    ['projectsInProgress', 'up'],
    ['batToValidate', 'down'],
    ['overdueInvoices', 'down'],
  ] as const) {
    const t = trend(k, good);
    if (t) kpiTrends[k] = t;
  }

  // Activité du mois
  for (const id of MENU_ORDER)
    s[id].activity = activityInfo(id, raw.activity?.[id], hidden);

  // Petites courbes des chiffres clés
  const kpiSeries: VillageData['kpis']['series'] = {};
  for (const k of [
    'projectsInProgress',
    'batToValidate',
    'overdueInvoices',
  ] as const) {
    const sr = pastSeries(raw.history, k, cur[k], now);
    if (sr) kpiSeries[k] = sr;
  }
  const deliveriesSr = deliverySeries(pr?.dueNext7, raw.calendar, now);
  if (deliveriesSr) kpiSeries.deliveries = deliveriesSr;

  // Livraisons du jour (fiche « Ma journée ») : la liste lue pour elles, sinon
  // les projets mis en avant (un serveur plus ancien ne l'envoie pas) — le
  // nombre complète ce que la liste ne montre pas.
  const todayDeliveries: DayDelivery[] = (
    pr?.todayList ??
    ranked.filter(
      (p) =>
        ACTIVE.includes(p.state) &&
        !!p.endDate &&
        dayjs(p.endDate).isSame(today, 'day')
    )
  ).map((p) => ({
    documentId: p.documentId,
    name: p.name,
    customer: p.customer?.name || 'Client non renseigné',
  }));
  const todayDeliveryCount = Math.max(
    todayDeliveries.length,
    num(pr?.dueToday) ?? 0
  );

  // Livraisons du jour : projets à livrer aujourd'hui ou livraisons du calendrier
  const calendarDeliveries = (raw.calendar ?? []).filter(
    (e) => e.category === 'livraison' && occursOn(e, now)
  ).length;
  const deliveries = Math.max(num(pr?.dueToday) ?? 0, calendarDeliveries);

  return {
    kpis: {
      projectsInProgress: inProgress,
      batToValidate: batCount,
      nextDelivery: nextDelivery ? fmtDay(nextDelivery) : pr ? 'Aucune' : null,
      nextDeliveryIn: nextDelivery
        ? (() => {
            const days = dayjs(nextDelivery)
              .startOf('day')
              .diff(today.startOf('day'), 'day');
            return days <= 0
              ? 'aujourd’hui'
              : days === 1
                ? 'demain'
                : `dans ${days} jours`;
          })()
        : null,
      overdueInvoices: overdueCount,
      trends: kpiTrends,
      series: kpiSeries,
    },
    sections: s,
    projects,
    todayDeliveries,
    todayDeliveryCount,
    flowCounts: {
      commandes:
        typeof raw.activity?.boutique?.current === 'number'
          ? raw.activity.boutique.current
          : null,
      livraisons: pr?.dueNext7
        ? pr.dueNext7.reduce((sum, n) => sum + (Number(n) || 0), 0)
        : null,
      factures: raw.invoices ? raw.invoices.unpaid.length : null,
      demandes: num(raw.quotes?.requested),
      production: inProgress ?? null,
      tickets: num(raw.tickets?.open),
    },
    life: { vans: Math.min(3, deliveries) },
  };
};
