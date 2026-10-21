// Lectures du village, une par domaine : une requête GraphQL refusée (champ
// absent d'un Strapi pas encore déployé, droit manquant…) n'éteint que les
// bâtiments qu'elle alimente, jamais tout le village. Les comptes passent par
// `pagination: { pageSize: 1 }` + `pageInfo.total` (sinon Strapi lit 100 lignes).
import dayjs from 'dayjs';
import ApiService from '@/services/ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetCalendarEvents } from '@/services/CalendarEventService';
import {
  apiGetCommissions,
  apiGetPayoutRequests,
  apiGetReferralSettings,
} from '@/services/GeneratorServices';
import { apiGetCampaigns } from '@/services/CampaignServices';
import { apiGetChatHistory } from '@/services/ChatbotServices';
import { apiGetRelecteurStatus } from '@/services/RelecteurServices';
import { apiGetImbretexProducts } from '@/services/ImbretexService';
import { apiGetAdminPreference } from '@/services/AdminPreferenceService';
import {
  loadManualOverrides,
  loadProducerCapacities,
} from '@/services/PlanningService';
import {
  UNASSIGNED_ID,
  analyzeProjects,
  computeProducerLoads,
  countRisks,
} from '@/utils/planning/scheduler';
import type { Project } from '@/@types/project';
import {
  staleTickets,
  type RawEvent,
  type RawInvoice,
  type RawProject,
  type RawTicket,
  type RawVillage,
} from './villageData';

type Conn = { pageInfo?: { total?: number } } | null | undefined;
const total = (c: Conn) =>
  typeof c?.pageInfo?.total === 'number' ? c.pageInfo.total : null;

const gql = <T>(query: string, variables: Record<string, unknown> = {}) =>
  unwrapData<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ApiService.fetchData<any>({
      url: API_GRAPHQL_URL,
      method: 'post',
      data: { query, variables },
    })
  );

const ACTIVE = '["pending","pending_paid","waiting"]';
const PROJECT_FIELDS = `documentId name state endDate createdAt
  customer { name } images { url }
  orderItem { batStatus sizeAndColorSelections product { name requiresBat images { url } batFile { url } } }
  checklistItems tasks(pagination: { limit: 100 }) { state }`;

const dayStart = () => dayjs().startOf('day').toISOString();

export const fetchProjects = async (): Promise<
  Pick<RawVillage, 'projects'>
> => {
  const d = await gql<Record<string, Conn & { nodes?: RawProject[] }>>(
    `query VillageProjects($dayStart: DateTime) {
      pending: projects_connection(filters: { state: { eq: "pending" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      pendingPaid: projects_connection(filters: { state: { eq: "pending_paid" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      waiting: projects_connection(filters: { state: { eq: "waiting" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      sav: projects_connection(filters: { state: { eq: "sav" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      late: projects_connection(filters: { state: { in: ${ACTIVE} }, endDate: { lt: $dayStart } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      next: projects_connection(filters: { state: { in: ${ACTIVE} }, endDate: { gte: $dayStart } }, sort: ["endDate:asc"], pagination: { pageSize: 1 }) { nodes { documentId name endDate customer { name } } }
    }`,
    { dayStart: dayStart() }
  );
  return {
    projects: {
      pending: total(d?.pending),
      pendingPaid: total(d?.pendingPaid),
      waiting: total(d?.waiting),
      sav: total(d?.sav),
      late: total(d?.late),
      next: d?.next?.nodes?.[0] ?? null,
    },
  };
};

/** Projets actifs à la livraison la plus proche (les plus anciennes dates d'abord). */
export const fetchSamples = async (): Promise<Pick<RawVillage, 'samples'>> => {
  const d = await gql<{ projects_connection?: { nodes?: RawProject[] } }>(
    `query VillageSamples {
      projects_connection(filters: { state: { in: ${ACTIVE} } }, sort: ["endDate:asc"], pagination: { pageSize: 8 }) {
        nodes { ${PROJECT_FIELDS} }
      }
    }`
  );
  return { samples: d?.projects_connection?.nodes ?? [] };
};

/**
 * Projets dont le produit exige un BAT non encore validé. Le fichier de BAT est
 * un média (non filtrable) : le tri « déposé, en attente du client » se fait
 * ensuite (batAwaitingClient).
 */
export const fetchBat = async (): Promise<
  Pick<RawVillage, 'batCandidates'>
> => {
  const d = await gql<{ projects_connection?: { nodes?: RawProject[] } }>(
    `query VillageBat {
      projects_connection(
        filters: {
          state: { in: ["pending", "pending_paid", "waiting", "sav"] }
          orderItem: { product: { requiresBat: { eq: true } }, or: [{ batStatus: { null: true } }, { batStatus: { eq: "pending" } }] }
        }
        pagination: { pageSize: 200 }
      ) { nodes { ${PROJECT_FIELDS} } }
    }`
  );
  return { batCandidates: d?.projects_connection?.nodes ?? [] };
};

export const fetchQuotesTickets = async (): Promise<
  Pick<RawVillage, 'quotes' | 'tickets'>
> => {
  // « Sans réponse depuis 48 h » : une demande de devis encore « reçue » 48 h
  // après sa création ; un ticket ouvert dont le client attend depuis 48 h
  // (calculé sur le fil des messages : Strapi ne filtre pas sur l'auteur du
  // dernier message). Un ticket de moins de 48 h ne peut pas être en retard.
  const now = new Date();
  const d = await gql<Record<string, Conn & { nodes?: RawTicket[] }>>(
    `query VillageQuotesTickets($staleBefore: DateTime) {
      proposed: quotes_connection(filters: { status: { eq: "proposed" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      requested: quotes_connection(filters: { status: { eq: "requested" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      requestedStale: quotes_connection(filters: { status: { eq: "requested" }, createdAt: { lt: $staleBefore } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      ticketsOpen: tickets_connection(filters: { state: { eq: "pending" } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      ticketsOld: tickets_connection(filters: { state: { eq: "pending" }, createdAt: { lt: $staleBefore } }, sort: ["createdAt:asc"], pagination: { pageSize: 200 }) { nodes { createdAt messages } }
    }`,
    { staleBefore: dayjs(now).subtract(48, 'hour').toISOString() }
  );
  return {
    quotes: {
      proposed: total(d?.proposed),
      requested: total(d?.requested),
      requestedStale: total(d?.requestedStale),
    },
    tickets: {
      open: total(d?.ticketsOpen),
      stale: d?.ticketsOld?.nodes
        ? staleTickets(d.ticketsOld.nodes, now)
        : null,
    },
  };
};

/**
 * Clients. Tous les clients historiques ont été passés `premium = true` par une
 * migration : les vrais abonnés sont ceux qui ont une date d'abonnement
 * (posée par le webhook Stripe). « À traiter » = même règle que la pastille
 * du menu Premium (premium et pas encore traité, null compris).
 */
export const fetchCustomers = async (): Promise<
  Pick<RawVillage, 'customers' | 'producers'>
> => {
  const d = await gql<Record<string, Conn>>(
    `query VillageCustomers($monthStart: DateTime) {
      all: customers_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
      newMonth: customers_connection(filters: { createdAt: { gte: $monthStart } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      subscribers: customers_connection(filters: { premium: { eq: true }, premiumSince: { notNull: true } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      toProcess: customers_connection(filters: { premium: { eq: true }, or: [{ premiumProcessed: { eq: false } }, { premiumProcessed: { null: true } }] }, pagination: { pageSize: 1 }) { pageInfo { total } }
      producers: producers_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
    }`,
    { monthStart: dayjs().startOf('month').toISOString() }
  );
  return {
    customers: {
      total: total(d?.all),
      newMonth: total(d?.newMonth),
      subscribers: total(d?.subscribers),
      toProcess: total(d?.toProcess),
    },
    producers: { total: total(d?.producers) },
  };
};

/** Commandes de la boutique : seules celles payées ont un projet. */
export const fetchShop = async (): Promise<Pick<RawVillage, 'shop'>> => {
  const now = dayjs().toISOString();
  const d = await gql<Record<string, Conn>>(
    `query VillageShop($dayStart: DateTime, $now: DateTime) {
      ordersToday: orderItems_connection(filters: { createdAt: { gte: $dayStart }, project: { documentId: { notNull: true } } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      ordersPending: orderItems_connection(filters: { state: { eq: "pending" }, project: { documentId: { notNull: true } } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      productsActive: products_connection(filters: { active: { eq: true } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      promoUsable: promoCodes_connection(
        filters: {
          active: { eq: true }
          and: [
            { or: [{ validFrom: { null: true } }, { validFrom: { lte: $now } }] }
            { or: [{ validUntil: { null: true } }, { validUntil: { gte: $now } }] }
          ]
        }
        pagination: { pageSize: 1 }
      ) { pageInfo { total } }
    }`,
    { dayStart: dayStart(), now }
  );
  return {
    shop: {
      ordersToday: total(d?.ordersToday),
      ordersPending: total(d?.ordersPending),
      productsActive: total(d?.productsActive),
      promoUsable: total(d?.promoUsable),
    },
  };
};

export const fetchAttributes = async (): Promise<
  Pick<RawVillage, 'attributes' | 'banners'>
> => {
  const d = await gql<Record<string, Conn>>(
    `query VillageAttributes {
      sizes: sizes_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
      colors: colors_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
      forms: forms_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
      checklists: checklists_connection(pagination: { pageSize: 1 }) { pageInfo { total } }
      banners: banners_connection(filters: { active: { eq: true } }, pagination: { pageSize: 1 }) { pageInfo { total } }
    }`
  );
  return {
    attributes: {
      sizes: total(d?.sizes),
      colors: total(d?.colors),
      forms: total(d?.forms),
      checklists: total(d?.checklists),
    },
    banners: { active: total(d?.banners) },
  };
};

/** Un utilisateur inséré sans documentId fait échouer toute lecture : on l'écarte. */
export const fetchUsers = async (): Promise<Pick<RawVillage, 'users'>> => {
  const d = await gql<Record<string, Conn>>(
    `query VillageUsers {
      all: usersPermissionsUsers_connection(filters: { documentId: { notNull: true } }, pagination: { pageSize: 1 }) { pageInfo { total } }
      unconfirmed: usersPermissionsUsers_connection(filters: { documentId: { notNull: true }, confirmed: { eq: false } }, pagination: { pageSize: 1 }) { pageInfo { total } }
    }`
  );
  return {
    users: { total: total(d?.all), unconfirmed: total(d?.unconfirmed) },
  };
};

/** Factures non réglées (même règle « payé » que le serveur). */
export const fetchInvoices = async (): Promise<
  Pick<RawVillage, 'invoices'>
> => {
  const d = await gql<{
    invoices_connection?: {
      nodes?: RawInvoice[];
      pageInfo?: { total?: number };
    };
  }>(
    `query VillageInvoices {
      invoices_connection(
        filters: {
          and: [
            { or: [{ state: { null: true } }, { state: { ne: "canceled" } }] }
            { or: [{ paymentState: { null: true } }, { paymentState: { notIn: ["fulfilled", "transfer_received"] } }] }
          ]
        }
        sort: ["dueDate:asc"]
        pagination: { pageSize: 1000 }
      ) { nodes { documentId name totalAmount date dueDate paymentState customer { name } } pageInfo { total } }
    }`
  );
  if (!d?.invoices_connection) throw new Error('factures illisibles');
  return {
    invoices: {
      unpaid: d.invoices_connection.nodes ?? [],
      total: total(d.invoices_connection),
    },
  };
};

/** Évènements du calendrier (repli sur la copie locale, comme le widget Calendrier). */
export const fetchCalendar = async (): Promise<
  Pick<RawVillage, 'calendar'>
> => {
  try {
    const d = await unwrapData(apiGetCalendarEvents());
    return {
      calendar: (d?.calendarEvents_connection?.nodes ??
        []) as unknown as RawEvent[],
    };
  } catch (e) {
    const local = JSON.parse(
      localStorage.getItem('peg:calendarEvents') || 'null'
    );
    if (Array.isArray(local)) return { calendar: local };
    throw e;
  }
};

/** Charge des producteurs : même moteur et même horizon (2 semaines) que la page Planning. */
export const fetchPlanning = async (): Promise<
  Pick<RawVillage, 'planning'>
> => {
  const [d, overrides, capacities] = await Promise.all([
    gql<{ projects_connection?: { nodes?: Project[] } }>(
      `query VillagePlanning {
        projects_connection(filters: { state: { in: ["pending", "waiting", "sav"] } }, pagination: { pageSize: 1000 }) {
          nodes { documentId name state priority price endDate producer { documentId name } tasks(pagination: { limit: 100 }) { state } }
        }
      }`
    ),
    loadManualOverrides(),
    loadProducerCapacities(),
  ]);
  const scheduled = analyzeProjects(
    d?.projects_connection?.nodes ?? [],
    new Date(),
    overrides
  );
  const loads = computeProducerLoads(scheduled, 2, capacities).filter(
    (l) => l.producerId !== UNASSIGNED_ID
  );
  const risks = countRisks(scheduled);
  return {
    planning: {
      overloaded: loads
        .filter((l) => l.overloaded)
        .map((l) => ({
          name: l.producerName,
          totalDays: l.totalDays,
          capacityDays: l.capacityDays,
        })),
      loads: loads.map((l) => ({
        name: l.producerName,
        totalDays: l.totalDays,
        capacityDays: l.capacityDays,
        projectCount: l.projectCount,
      })),
      late: risks.late,
      tight: risks.tight,
    },
  };
};

const leadsCount = async (params: Record<string, string>) => {
  const qs = new URLSearchParams({
    'pagination[page]': '1',
    'pagination[pageSize]': '1',
    ...params,
  });
  const res = await ApiService.fetchData<{
    meta?: { pagination?: { total?: number } };
  }>({
    url: `/leads?${qs}`,
    method: 'get',
  });
  const t = res.data?.meta?.pagination?.total;
  return typeof t === 'number' ? t : null;
};

/** Leads à rappeler : pas encore gagnés/perdus et prochaine action échue. */
export const fetchLeads = async (): Promise<Pick<RawVillage, 'leads'>> => {
  const [toCall, newMonth] = await Promise.all([
    leadsCount({
      'filters[stage][$notIn][0]': 'gagné',
      'filters[stage][$notIn][1]': 'perdu',
      'filters[nextActionDate][$lte]': dayjs().format('YYYY-MM-DD'),
    }),
    leadsCount({
      'filters[createdAt][$gte]': dayjs().startOf('month').toISOString(),
    }),
  ]);
  return { leads: { toCall, newMonth } };
};

export const fetchGenerators = async (): Promise<
  Pick<RawVillage, 'generators'>
> => {
  const [commissions, payouts, settings] = await Promise.all([
    apiGetCommissions({ status: 'pending' }),
    apiGetPayoutRequests('pending'),
    apiGetReferralSettings().catch(() => null),
  ]);
  return {
    generators: {
      pendingCount: commissions.length,
      pendingAmount: commissions.reduce(
        (s, c) => s + (Number(c.amount) || 0),
        0
      ),
      payoutRequests: payouts.length,
      autoValidate: !!settings?.autoValidate,
    },
  };
};

export const fetchCampaigns = async (): Promise<
  Pick<RawVillage, 'campaigns'>
> => {
  const res = await apiGetCampaigns();
  const data = res.data as unknown as {
    campaigns?: {
      title?: string;
      status?: string;
      archived?: boolean;
      sendAt?: string | null;
    }[];
    overview?: { sentLast30Days?: number };
  };
  const scheduled = (data?.campaigns ?? [])
    .filter((c) => !c.archived && c.status === 'scheduled')
    .map((c) => ({ title: c.title || 'Campagne', sendAt: c.sendAt ?? null }));
  const sent = data?.overview?.sentLast30Days;
  return {
    campaigns: {
      scheduled,
      sentLast30Days: typeof sent === 'number' ? sent : null,
    },
  };
};

export const fetchIa = async (): Promise<Pick<RawVillage, 'ia'>> => {
  const [history, relecteur] = await Promise.allSettled([
    apiGetChatHistory({ page: 1, pageSize: 1, dateFrom: dayStart() }),
    apiGetRelecteurStatus(),
  ]);
  const conversations =
    history.status === 'fulfilled' &&
    typeof history.value.data?.total === 'number'
      ? history.value.data.total
      : null;
  const status =
    relecteur.status === 'fulfilled' ? relecteur.value.data?.status : undefined;
  if (conversations === null && !status) throw new Error('IA illisible');
  return {
    ia: {
      conversationsToday: conversations,
      relecteurEnabled: status ? !!status.enabled : null,
      proposed:
        typeof status?.byStatus?.proposed === 'number'
          ? status.byStatus.proposed
          : null,
    },
  };
};

const IMBRETEX_CACHE = 'peg:villageImbretex';

/** Catalogue fournisseur (appel externe lent) : mis de côté une heure. */
export const fetchImbretex = async (): Promise<
  Pick<RawVillage, 'imbretex'>
> => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(IMBRETEX_CACHE) || 'null');
    if (cached && Date.now() - cached.at < 3600_000)
      return { imbretex: cached.value };
  } catch {
    // stockage indisponible : on relit
  }
  const res = await apiGetImbretexProducts({ page: 1, perPage: 1 });
  const value = {
    productCount:
      typeof res?.productCount === 'number' ? res.productCount : null,
    variantCount:
      typeof res?.variantCount === 'number' ? res.variantCount : null,
  };
  try {
    sessionStorage.setItem(
      IMBRETEX_CACHE,
      JSON.stringify({ at: Date.now(), value })
    );
  } catch {
    // tant pis pour le cache
  }
  return { imbretex: value };
};

/** Pense-bête : même source que le widget (copie locale d'abord, sinon Strapi). */
export const fetchTodos = async (
  userDocumentId?: string
): Promise<Pick<RawVillage, 'todos'>> => {
  try {
    const local = JSON.parse(
      localStorage.getItem('peg:dashboardTodos') || '[]'
    );
    if (Array.isArray(local) && local.length) return { todos: local };
  } catch {
    // copie locale illisible : on lit Strapi
  }
  if (!userDocumentId) return { todos: [] };
  const pref = await apiGetAdminPreference(userDocumentId);
  const todos = Array.isArray(pref?.todos) ? pref.todos : [];
  return { todos };
};

/** Le serveur n'a pas (encore) la route du résumé : inutile de la redemander. */
let summaryMissing = false;

/**
 * Résumé calculé par Strapi en un seul appel (`GET /api/village/summary`),
 * avec les bornes de dates de l'admin (heure locale, comme les lectures
 * ci-dessous). null si la route n'existe pas ou échoue : le village relit
 * alors tout lui-même.
 */
export const fetchVillageSummary = async (): Promise<RawVillage | null> => {
  if (summaryMissing) return null;
  try {
    const res = await ApiService.fetchData<{
      result?: boolean;
      data?: RawVillage;
    }>({
      url: '/village/summary',
      method: 'get',
      params: {
        dayStart: dayStart(),
        monthStart: dayjs().startOf('month').toISOString(),
        today: dayjs().format('YYYY-MM-DD'),
      },
    });
    return res.data?.result && res.data.data ? res.data.data : null;
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) summaryMissing = true;
    return null;
  }
};

/**
 * Toutes les lectures, chacune isolée, avec les parties de `RawVillage`
 * qu'elle remplit : celles que le résumé du serveur a déjà fournies sont
 * sautées (planning, Imbretex et pense-bête sont toujours lus ici).
 */
export const villageReaders = (
  userDocumentId?: string
): {
  keys: (keyof RawVillage)[];
  read: () => Promise<Partial<RawVillage>>;
}[] => [
  { keys: ['projects'], read: fetchProjects },
  { keys: ['samples'], read: fetchSamples },
  { keys: ['batCandidates'], read: fetchBat },
  { keys: ['quotes', 'tickets'], read: fetchQuotesTickets },
  { keys: ['customers', 'producers'], read: fetchCustomers },
  { keys: ['shop'], read: fetchShop },
  { keys: ['attributes', 'banners'], read: fetchAttributes },
  { keys: ['users'], read: fetchUsers },
  { keys: ['invoices'], read: fetchInvoices },
  { keys: ['calendar'], read: fetchCalendar },
  { keys: ['planning'], read: fetchPlanning },
  { keys: ['leads'], read: fetchLeads },
  { keys: ['generators'], read: fetchGenerators },
  { keys: ['campaigns'], read: fetchCampaigns },
  { keys: ['ia'], read: fetchIa },
  { keys: ['imbretex'], read: fetchImbretex },
  { keys: ['todos'], read: () => fetchTodos(userDocumentId) },
];
