import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Color } from '@/@types/product'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'

export type GetColorsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetColorsResponse = {
    nodes: Color[]
    pageInfo: PageInfo
};

export async function apiGetColors(data: GetColorsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{colors_connection: GetColorsResponse}>>> {
    const query = `
    query GetColors($searchTerm: String, $pagination: PaginationArg) {
        colors_connection (filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
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
    return ApiService.fetchData<ApiResponse<{colors_connection: GetColorsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create color
export type CreateColorRequest = Omit<Color, "documentId">

export async function apiCreateColor(data: CreateColorRequest): Promise<AxiosResponse<ApiResponse<{createColor: Color}>>> {
    const query = `
    mutation CreateColor($data: ColorInput!) {
        createColor(data: $data) {
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
    return ApiService.fetchData<ApiResponse<{createColor: Color}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete color
export type DeleteColorResponse = {
    documentId: string
}

export async function apiDeleteColor(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteColor: DeleteColorResponse}>>> {
    const query = `
    mutation DeleteColor($documentId: ID!) {
        deleteColor(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteColor: DeleteColorResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update color
export async function apiUpdateColor(color: Partial<Color>): Promise<AxiosResponse<ApiResponse<{updateColor: Color}>>> {
    const query = `
    mutation UpdateColor($documentId: ID!, $data: ColorInput!) {
        updateColor(documentId: $documentId, data: $data) {
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
  {documentId, ...data} = color,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateColor: Color}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get colors for specific product category
export async function apiGetProductCategoryColors(productCategoryDocumentId: string): Promise<AxiosResponse<ApiResponse<{colors: Color[]}>>> {
    const query = `
    query getProductColors($productCategoryDocumentId: ID!) {
        colors(filters: {productCategory: {documentId: {contains: $productCategoryDocumentId}}}) {
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

  return ApiService.fetchData<ApiResponse<{colors: Color[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}