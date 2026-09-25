import ApiService from './ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import type {
  CampaignCategoryOption,
  CampaignProductOption,
  AudienceDirectory,
  AudiencePreview,
  Campaign,
  CampaignAudience,
  CampaignInput,
  CampaignListItem,
  CampaignRecipient,
  CampaignsOverview,
  CampaignStats,
  CampaignTimeline,
  ClientCampaign,
  OpenChannel,
} from '@/@types/campaign';

/**
 * Campagnes clients (Strapi, routes /api/campaigns/*).
 *  - /campaigns/admin/* : admin (JWT + rôle vérifiés dans le contrôleur)
 *  - /campaigns/me/*    : compte connecté (ses campagnes reçues uniquement)
 * Backend : peg_strapi `src/api/campaign/`, `src/services/campaign.service.ts`.
 */

type Ok<T> = { result: boolean; message?: string } & T;

// ── Admin ────────────────────────────────────────────────────────────────────

export const apiGetCampaigns = () =>
  ApiService.fetchData<Ok<{ campaigns: CampaignListItem[]; overview: CampaignsOverview; sandbox: boolean; emailConfigured: boolean }>>({
    url: '/campaigns/admin',
    method: 'get',
  });

export const apiGetCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}`, method: 'get' });

export const apiCreateCampaign = (data: CampaignInput) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: '/campaigns/admin', method: 'post', data });

export const apiUpdateCampaign = (id: number, data: CampaignInput) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}`, method: 'put', data });

export const apiDeleteCampaign = (id: number) =>
  ApiService.fetchData<Ok<object>>({ url: `/campaigns/admin/${id}`, method: 'delete' });

/** `sendAt` futur → programmée ; sinon envoi immédiat (en tâche de fond). */
export const apiSendCampaign = (id: number, sendAt: string | null) =>
  ApiService.fetchData<Ok<{ scheduled: boolean; recipients: number; campaign: Campaign }>>({
    url: `/campaigns/admin/${id}/send`,
    method: 'post',
    data: { sendAt },
  });

export const apiUnscheduleCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/unschedule`, method: 'post' });

export const apiSendCampaignTest = (id: number) =>
  ApiService.fetchData<Ok<{ test: { bell: boolean; email: 'sent' | 'failed' | 'skipped' | 'noemail'; emailError: string | null; to: string | null } }>>({
    url: `/campaigns/admin/${id}/test`,
    method: 'post',
  });

/** `unopened` : relance ciblée sur les comptes qui n'ont pas ouvert la campagne. */
export const apiDuplicateCampaign = (id: number, mode: 'copy' | 'unopened' = 'copy') =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/duplicate`, method: 'post', data: { mode } });

export const apiArchiveCampaign = (id: number, archived: boolean) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/archive`, method: 'post', data: { archived } });

/** Retire une campagne envoyée des pop-ups et des Actualités des clients. */
export const apiWithdrawCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign }>>({ url: `/campaigns/admin/${id}/withdraw`, method: 'post' });

export const apiGetCampaignStats = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: Campaign; stats: CampaignStats; timeline: CampaignTimeline | null; sandbox: boolean }>>({
    url: `/campaigns/admin/${id}/stats`,
    method: 'get',
  });

export const apiGetCampaignRecipients = (id: number) =>
  ApiService.fetchData<Ok<{ recipients: CampaignRecipient[] }>>({ url: `/campaigns/admin/${id}/recipients`, method: 'get' });

export const apiGetAudienceDirectory = () =>
  ApiService.fetchData<Ok<AudienceDirectory>>({ url: '/campaigns/admin/directory', method: 'get' });

export const apiPreviewAudience = (audience: CampaignAudience) =>
  ApiService.fetchData<Ok<{ audience: AudiencePreview }>>({ url: '/campaigns/admin/audience', method: 'post', data: { audience } });

export const apiPreviewCampaignEmail = (data: CampaignInput) =>
  ApiService.fetchData<Ok<{ html: string }>>({ url: '/campaigns/admin/preview-email', method: 'post', data });

// ── Compte connecté ──────────────────────────────────────────────────────────

export const apiGetMyCampaigns = () =>
  ApiService.fetchData<Ok<{ campaigns: ClientCampaign[]; popups: ClientCampaign[]; unread: number }>>({
    url: '/campaigns/me',
    method: 'get',
  });

export const apiGetMyCampaign = (id: number) =>
  ApiService.fetchData<Ok<{ campaign: ClientCampaign }>>({ url: `/campaigns/me/${id}`, method: 'get' });

export const apiTrackCampaign = (id: number, kind: 'open' | 'click' | 'dismiss', channel: OpenChannel) =>
  ApiService.fetchData<Ok<object>>({ url: `/campaigns/me/${id}/track`, method: 'post', data: { kind, channel } });

// ── Destination du bouton : produits et catégories (GraphQL, champs minimaux) ─

type ProductNode = {
  documentId: string;
  name: string;
  price: number | null;
  inCatalogue: boolean | null;
  images?: { url: string }[] | null;
  productCategory?: { name: string } | null;
  customers?: { documentId: string }[] | null;
  customerCategories?: { documentId: string }[] | null;
};

// Une relation paginée à 1 suffit à savoir si le produit est attribué à quelqu'un.
const PRODUCT_FIELDS = `
  documentId
  name
  price
  inCatalogue
  images { url }
  productCategory { name }
  customers(pagination: { limit: 1 }) { documentId }
  customerCategories(pagination: { limit: 1 }) { documentId }
`;

const toProductOption = (p: ProductNode): CampaignProductOption => {
  const restricted = !p.inCatalogue && !!((p.customers && p.customers.length) || (p.customerCategories && p.customerCategories.length));
  return {
    documentId: p.documentId,
    name: p.name,
    price: typeof p.price === 'number' ? p.price : null,
    imageUrl: p.images?.[0]?.url || null,
    categoryName: p.productCategory?.name || '',
    inCatalogue: !!p.inCatalogue,
    restricted,
  };
};

/** Produit visible d'au moins un client : au catalogue, ou attribué (offre dédiée). */
const isReachable = (o: CampaignProductOption) => o.inCatalogue || o.restricted;

/**
 * Recherche de produits actifs pour le bouton d'action. Les produits qu'aucun
 * client ne peut voir (hors catalogue et non attribués — ex. imports Imbretex
 * privés) sont écartés : le client tomberait sur une fiche qui ne lui est pas destinée.
 */
export async function apiSearchCampaignProducts(searchTerm: string): Promise<CampaignProductOption[]> {
  const query = `
    query CampaignProducts($searchTerm: String) {
      products_connection(
        filters: { name: { containsi: $searchTerm }, active: { eq: true } }
        pagination: { page: 1, pageSize: 40 }
        sort: "name"
      ) { nodes { ${PRODUCT_FIELDS} } }
    }`;
  const res = await ApiService.fetchData<{ data?: { products_connection?: { nodes: ProductNode[] } } }>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { searchTerm } },
  });
  return (res.data?.data?.products_connection?.nodes || []).map(toProductOption).filter(isReachable).slice(0, 20);
}

export async function apiGetCampaignProduct(documentId: string): Promise<CampaignProductOption | null> {
  const query = `query CampaignProduct($documentId: ID!) { product(documentId: $documentId) { ${PRODUCT_FIELDS} } }`;
  const res = await ApiService.fetchData<{ data?: { product?: ProductNode | null } }>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { documentId } },
  });
  const p = res.data?.data?.product;
  return p ? toProductOption(p) : null;
}

/** Catégories actives du catalogue (« Parent › Sous-catégorie »). */
export async function apiGetCampaignCategories(): Promise<CampaignCategoryOption[]> {
  const query = `
    query CampaignCategories {
      productCategories_connection(filters: { active: { eq: true } }, pagination: { page: 1, pageSize: 300 }, sort: "order:asc") {
        nodes { documentId name image { url } parent { name } }
      }
    }`;
  const res = await ApiService.fetchData<{ data?: { productCategories_connection?: { nodes: { documentId: string; name: string; image?: { url: string } | null; parent?: { name: string } | null }[] } } }>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query },
  });
  return (res.data?.data?.productCategories_connection?.nodes || [])
    .map((c) => ({ documentId: c.documentId, name: c.parent?.name ? `${c.parent.name} › ${c.name}` : c.name, imageUrl: c.image?.url || null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
