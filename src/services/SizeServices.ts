import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Size } from '@/@types/product'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'

//
export type GetSizesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetSizesResponse = {
    nodes: Size[]
    pageInfo: PageInfo
};

export async function apiGetSizes(data: GetSizesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{sizes_connection: GetSizesResponse}>>> {
    const query = `
    query GetSizes($searchTerm: String, $pagination: PaginationArg) {
        sizes_connection (filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                value
                description
                productCategory {
                    documentId
                    name
                }
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
    return ApiService.fetchData<ApiResponse<{sizes_connection: GetSizesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create size
export type CreateSizeRequest = Omit<Size, "documentId">

export async function apiCreateSize(data: CreateSizeRequest): Promise<AxiosResponse<ApiResponse<{createSize: Size}>>> {
    const query = `
    mutation CreateSize($data: SizeInput!) {
        createSize(data: $data) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createSize: Size}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete size
export type DeleteSizeResponse = {
    documentId: string
}

export async function apiDeleteSize(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteSize: DeleteSizeResponse}>>> {
    const query = `
    mutation DeleteSize($documentId: ID!) {
        deleteSize(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteSize: DeleteSizeResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update size
export async function apiUpdateSize(size: Partial<Size>): Promise<AxiosResponse<ApiResponse<{updateSize: Size}>>> {
    const query = `
    mutation UpdateSize($documentId: ID!, $data: SizeInput!) {
        updateSize(documentId: $documentId, data: $data) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,
  {documentId, ...data} = size,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateSize: Size}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get sizes for specific product category
export async function apiGetProductCategorySizes(productCategoryDocumentId: string): Promise<AxiosResponse<ApiResponse<{sizes: Size[]}>>> {
    const query = `
    query getProductSizes($productCategoryDocumentId: ID!) {
        sizes(filters: {productCategory: {documentId: {contains: $productCategoryDocumentId}}}) {
            documentId
            name
            value
            description
            productCategory {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    productCategoryDocumentId
  }

  return ApiService.fetchData<ApiResponse<{sizes: Size[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}