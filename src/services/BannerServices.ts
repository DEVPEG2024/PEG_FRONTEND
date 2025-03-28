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

// create banner
export type CreateBannerRequest = Omit<Banner, "documentId">

export async function apiCreateBanner(data: CreateBannerRequest): Promise<AxiosResponse<ApiResponse<{createBanner: Banner}>>> {
    const query = `
    mutation CreateBanner($data: BannerInput!) {
        createBanner(data: $data) {
            documentId
            image {
                documentId
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