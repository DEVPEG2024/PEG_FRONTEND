import ApiService from './ApiService'
import { Banner } from '@/@types/banner';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';

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

// Bannière par défaut : bannière ACTIVE sans client ni catégorie. Elle s'applique
// aux comptes qui n'ont pas de bannière propre (typiquement les comptes créés par
// les clients eux-mêmes). Renvoie null si aucune n'est configurée.
export type DefaultBannerNode = {
    documentId: string;
    image?: { url?: string } | null;
    customer?: { documentId?: string } | null;
    customerCategory?: { documentId?: string } | null;
};

export async function apiGetDefaultBanner(): Promise<DefaultBannerNode | null> {
    const query = `
    query DefaultBanner($pagination: PaginationArg) {
        banners_connection (filters: {active: {eq: true}}, pagination: $pagination) {
            nodes {
                documentId
                image { url }
                customer { documentId }
                customerCategory { documentId }
            }
        }
    }
  `;
    try {
        const res = await ApiService.fetchData<ApiResponse<{ banners_connection: { nodes: DefaultBannerNode[] } }>>({
            url: API_GRAPHQL_URL,
            method: 'post',
            data: { query, variables: { pagination: { page: 1, pageSize: 100 } } },
        });
        const nodes = res.data?.data?.banners_connection?.nodes ?? [];
        // La bannière par défaut = active, sans client ET sans catégorie, avec une image.
        return nodes.find(
            (b) => !b.customer?.documentId && !b.customerCategory?.documentId && b.image?.url
        ) ?? null;
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