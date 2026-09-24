import ApiService from './ApiService'
import { Banner } from '@/@types/banner';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosError, AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import type { BannerVisual } from '@/utils/bannerVisual';

// Nom réservé identifiant la bannière « nouveaux comptes » (accueil client).
// Elle est INDÉPENDANTE des bannières nommées du catalogue/projets/offres
// (« Bannière catalogue », « Bannière projets », etc.) qui, elles aussi, n'ont
// ni client ni catégorie : on ne peut donc PAS l'identifier par « sans portée ».
export const NEW_CUSTOMER_BANNER_NAME = 'NEW CUSTOMER';
export const isNewCustomerBanner = (name?: string | null): boolean =>
    (name ?? '').trim().toLowerCase() === NEW_CUSTOMER_BANNER_NAME.toLowerCase();

// ─── Image téléphone (`mobileImage`) ─────────────────────────────────────────
// Champ ajouté côté Strapi le 25/09/2026. Tant que le backend n'est pas
// redéployé, le demander fait échouer TOUTE la requête (champ inconnu → 400) :
// l'accueil client perdrait sa bannière, la liste admin serait vide. On le
// demande donc ; si le serveur ne le connaît pas, on rejoue sans lui et on s'en
// souvient pour la session. Les écrans masquent alors la version téléphone.
let mobileImageSupport: boolean | null = null;

export const isBannerMobileSupported = (): boolean => mobileImageSupport !== false;

const rejectsMobileImage = (payload: unknown): boolean => {
    const errors = (payload as { errors?: { message?: string }[] } | undefined)?.errors;
    return Array.isArray(errors) && errors.some((e) => (e?.message ?? '').includes('mobileImage'));
};

type GraphQLRequest = { query: string; variables?: Record<string, unknown> };

/**
 * Envoie une requête GraphQL qui mentionne `mobileImage`. `build(false)` doit
 * produire la même requête sans ce champ (sélection ET données écrites).
 */
export async function fetchBannerGraphQL<T>(
    build: (withMobile: boolean) => GraphQLRequest
): Promise<AxiosResponse<T>> {
    const send = (withMobile: boolean) =>
        ApiService.fetchData<T>({ url: API_GRAPHQL_URL, method: 'post', data: build(withMobile) });

    if (mobileImageSupport !== false) {
        try {
            const res = await send(true);
            if (!rejectsMobileImage(res.data)) {
                mobileImageSupport = true;
                return res;
            }
        } catch (err) {
            if (!rejectsMobileImage((err as AxiosError)?.response?.data)) throw err;
        }
        mobileImageSupport = false;
    }
    return send(false);
}

const IMAGE_FIELDS = `documentId name url width height size formats`;
const mobileImageField = (withMobile: boolean) =>
    withMobile ? `mobileImage { ${IMAGE_FIELDS} }` : '';

/** Retire `mobileImage` des données écrites quand le serveur ne le connaît pas. */
const withoutMobile = <D extends object>(data: D, withMobile: boolean): D => {
    if (withMobile || !('mobileImage' in data)) return data;
    const { mobileImage: _ignored, ...rest } = data as D & { mobileImage?: unknown };
    return rest as D;
};

// get banners
export type GetBannersRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetBannersResponse = {
    nodes: Banner[]
    pageInfo: PageInfo
};

export async function apiGetBanners(data: GetBannersRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{banners_connection: GetBannersResponse}>>> {
    return fetchBannerGraphQL((withMobile) => ({
        query: `
    query GetBanners($searchTerm: String, $pagination: PaginationArg) {
        banners_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                image { ${IMAGE_FIELDS} }
                ${mobileImageField(withMobile)}
                name
                customer {
                    documentId
                    name
                }
                customerCategory {
                    documentId
                    name
                }
                active
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
        variables: { ...data },
    }))
}

// Bannières de repli, quand le client n'a PAS de bannière propre complète
// (`customer.banner` absent ou sans image). Renvoie, dans l'ordre de priorité :
// la bannière de sa catégorie, puis la bannière « NEW CUSTOMER ». Le choix de
// l'image par appareil se fait ensuite dans utils/bannerVisual.ts.
export type FallbackBannerNode = BannerVisual & {
    documentId: string;
    customer?: { documentId?: string } | null;
    customerCategory?: { documentId?: string } | null;
};

export async function apiGetFallbackBanners(customerCategoryDocumentId?: string | null): Promise<BannerVisual[]> {
    try {
        const res = await fetchBannerGraphQL<ApiResponse<{ banners_connection: { nodes: FallbackBannerNode[] } }>>(
            (withMobile) => ({
                query: `
    query FallbackBanner($pagination: PaginationArg) {
        banners_connection (filters: {active: {eq: true}}, pagination: $pagination) {
            nodes {
                documentId
                name
                image { url }
                ${mobileImageField(withMobile)}
                customer { documentId }
                customerCategory { documentId }
            }
        }
    }
  `,
                variables: { pagination: { page: 1, pageSize: 100 } },
            })
        );
        const nodes = (res.data?.data?.banners_connection?.nodes ?? []).filter(
            (b) => b.image?.url || b.mobileImage?.url
        );
        const chain: BannerVisual[] = [];

        // 1) Bannière de la catégorie du client (sans client spécifique — ce cas
        //    est déjà couvert par customer.banner).
        if (customerCategoryDocumentId) {
            const byCategory = nodes.find(
                (b) => b.customerCategory?.documentId === customerCategoryDocumentId && !b.customer?.documentId
            );
            if (byCategory) chain.push(byCategory);
        }

        // 2) Bannière « nouveaux comptes » : identifiée par son NOM (NEW CUSTOMER),
        //    pas par « sans portée » — sinon on servirait une bannière du catalogue.
        const newCustomer = nodes.find(
            (b) => isNewCustomerBanner(b.name) && !b.customer?.documentId && !b.customerCategory?.documentId
        );
        if (newCustomer) chain.push(newCustomer);
        return chain;
    } catch {
        // Ex. : le rôle client n'a pas le droit de lister les bannières côté Strapi.
        // On dégrade silencieusement (le dashboard retombe sur son fond par défaut).
        return [];
    }
}

const bannerSelection = (withMobile: boolean) => `
            documentId
            image {
                documentId
                name
                url
            }
            ${withMobile ? 'mobileImage { documentId name url }' : ''}
            name
            customer {
                documentId
                name
            }
            customerCategory {
                documentId
                name
            }
            active`;

// create banner
export type CreateBannerRequest = Omit<Banner, "documentId">

export async function apiCreateBanner(data: CreateBannerRequest): Promise<AxiosResponse<ApiResponse<{createBanner: Banner}>>> {
    return fetchBannerGraphQL((withMobile) => ({
        query: `
    mutation CreateBanner($data: BannerInput!) {
        createBanner(data: $data) {${bannerSelection(withMobile)}
        }
    }
  `,
        variables: { data: withoutMobile(data, withMobile) },
    }))
}

// delete banner
export type DeleteBannerResponse = {
    documentId: string
}

export async function apiDeleteBanner(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteBanner: DeleteBannerResponse}>>> {
    const query = `
    mutation DeleteBanner($documentId: ID!) {
        deleteBanner(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteBanner: DeleteBannerResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update banner
export async function apiUpdateBanner(banner: Partial<Banner>): Promise<AxiosResponse<ApiResponse<{updateBanner: Banner}>>> {
    const { documentId, ...data } = banner;
    return fetchBannerGraphQL((withMobile) => ({
        query: `
    mutation UpdateBanner($documentId: ID!, $data: BannerInput!) {
        updateBanner(documentId: $documentId, data: $data) {${bannerSelection(withMobile)}
        }
    }
  `,
        variables: { documentId, data: withoutMobile(data, withMobile) },
    }))
}

// ─── Bannière propre d'un client, image par image ────────────────────────────
// Utilisé par l'onglet Premium : l'admin change l'image ordinateur ou
// téléphone d'un client sans passer par la liste des bannières. Sans bannière
// propre, on la crée puis on la rattache au client — par la fiche CLIENT, qui
// porte la relation (`banner.customer` est `mappedBy`).
export type BannerSlot = 'image' | 'mobileImage';

export type CustomerBanner = BannerVisual & { documentId: string };

export async function apiSetCustomerBannerImage({
    customerDocumentId,
    customerName,
    bannerDocumentId,
    slot,
    fileId,
}: {
    customerDocumentId: string;
    customerName: string;
    bannerDocumentId?: string | null;
    slot: BannerSlot;
    /** id du média téléversé, ou null pour retirer l'image. */
    fileId: string | null;
}): Promise<CustomerBanner> {
    if (bannerDocumentId) {
        const res = await apiUpdateBanner({ documentId: bannerDocumentId, [slot]: fileId } as unknown as Partial<Banner>);
        assertNoGraphQLErrors(res.data);
        return res.data.data.updateBanner;
    }
    const created = await apiCreateBanner({
        name: `Bannière ${customerName}`.trim(),
        [slot]: fileId,
        active: true,
    } as unknown as CreateBannerRequest);
    assertNoGraphQLErrors(created.data);
    const banner = created.data?.data?.createBanner;
    if (!banner?.documentId) throw new Error('Bannière non créée');

    const linked = await ApiService.fetchData<ApiResponse<unknown>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query: `
    mutation LinkCustomerBanner($documentId: ID!, $data: CustomerInput!) {
        updateCustomer(documentId: $documentId, data: $data) { documentId }
    }`,
            variables: { documentId: customerDocumentId, data: { banner: banner.documentId } },
        },
    });
    assertNoGraphQLErrors(linked.data);
    return banner;
}

function assertNoGraphQLErrors(payload: unknown): void {
    const errors = (payload as { errors?: { message?: string }[] } | undefined)?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
        throw new Error(errors[0]?.message ?? 'GraphQL error');
    }
}
