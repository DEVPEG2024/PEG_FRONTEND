import ApiService from './ApiService'
import { Banner } from '@/@types/banner';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// Nom réservé identifiant la bannière « nouveaux comptes » (accueil client).
// Elle est INDÉPENDANTE des bannières nommées du catalogue/projets/offres
// (« Bannière catalogue », « Bannière projets », etc.) qui, elles aussi, n'ont
// ni client ni catégorie : on ne peut donc PAS l'identifier par « sans portée ».
export const NEW_CUSTOMER_BANNER_NAME = 'NEW CUSTOMER';
export const isNewCustomerBanner = (name?: string | null): boolean =>
    (name ?? '').trim().toLowerCase() === NEW_CUSTOMER_BANNER_NAME.toLowerCase();

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
    const query = `
    query GetBanners($searchTerm: String, $pagination: PaginationArg) {
        banners_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                image {
                    documentId
                    name
                    url
                }
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
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{banners_connection: GetBannersResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// Résolution de la bannière affichée quand le client n'a PAS de bannière propre
// (`customer.banner` absent). Priorité : bannière de sa catégorie → bannière par
// défaut (active, sans client ni catégorie). Renvoie l'URL de l'image, ou null.
export type FallbackBannerNode = {
    documentId: string;
    name?: string | null;
    image?: { url?: string } | null;
    customer?: { documentId?: string } | null;
    customerCategory?: { documentId?: string } | null;
};

export async function apiGetFallbackBannerUrl(customerCategoryDocumentId?: string | null): Promise<string | null> {
    const query = `
    query FallbackBanner($pagination: PaginationArg) {
        banners_connection (filters: {active: {eq: true}}, pagination: $pagination) {
            nodes {
                documentId
                name
                image { url }
                customer { documentId }
                customerCategory { documentId }
            }
        }
    }
  `;
    try {
        const res = await ApiService.fetchData<ApiResponse<{ banners_connection: { nodes: FallbackBannerNode[] } }>>({
            url: API_GRAPHQL_URL,
            method: 'post',
            data: { query, variables: { pagination: { page: 1, pageSize: 100 } } },
        });
        const nodes = (res.data?.data?.banners_connection?.nodes ?? []).filter((b) => b.image?.url);

        // 1) Bannière de la catégorie du client (sans client spécifique — ce cas
        //    est déjà couvert par customer.banner).
        if (customerCategoryDocumentId) {
            const byCategory = nodes.find(
                (b) => b.customerCategory?.documentId === customerCategoryDocumentId && !b.customer?.documentId
            );
            if (byCategory) return byCategory.image!.url!;
        }

        // 2) Bannière « nouveaux comptes » : identifiée par son NOM (NEW CUSTOMER),
        //    pas par « sans portée » — sinon on servirait une bannière du catalogue.
        const newCustomer = nodes.find(
            (b) => isNewCustomerBanner(b.name) && !b.customer?.documentId && !b.customerCategory?.documentId
        );
        return newCustomer?.image?.url ?? null;
    } catch {
        // Ex. : le rôle client n'a pas le droit de lister les bannières côté Strapi.
        // On dégrade silencieusement (le dashboard retombe sur son fond par défaut).
        return null;
    }
}

// create banner
export type CreateBannerRequest = Omit<Banner, "documentId">

export async function apiCreateBanner(data: CreateBannerRequest): Promise<AxiosResponse<ApiResponse<{createBanner: Banner}>>> {
    const query = `
    mutation CreateBanner($data: BannerInput!) {
        createBanner(data: $data) {
            documentId
            image {
                documentId
                name
                url
            }
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
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createBanner: Banner}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
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
    const query = `
    mutation UpdateBanner($documentId: ID!, $data: BannerInput!) {
        updateBanner(documentId: $documentId, data: $data) {
            documentId
            image {
                documentId
                name
                url
            }
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
    }
  `,
  {documentId, ...data} = banner,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateBanner: Banner}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}