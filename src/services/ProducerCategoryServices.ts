import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'
import { ProducerCategory } from '@/@types/producer'

// get producer categories
export type GetProducerCategoriesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProducerCategoriesResponse = {
    nodes: ProducerCategory[]
    pageInfo: PageInfo
};

export async function apiGetProducerCategories(data: GetProducerCategoriesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{producerCategories_connection: GetProducerCategoriesResponse}>>> {
    const query = `
    query GetProducerCategories($searchTerm: String, $pagination: PaginationArg) {
        producerCategories_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                producers (pagination: {limit: 100}){
                    documentId
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
    return ApiService.fetchData<ApiResponse<{producerCategories_connection: GetProducerCategoriesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create producer category
export type CreateProducerCategoryRequest = Omit<ProducerCategory, "documentId">

export async function apiCreateProducerCategory(data: CreateProducerCategoryRequest): Promise<AxiosResponse<ApiResponse<{createProducerCategory: ProducerCategory}>>> {
    const query = `
    mutation CreateProducerCategory($data: ProducerCategoryInput!) {
        createProducerCategory(data: $data) {
            documentId
            name
            producers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createProducerCategory: ProducerCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update producer category
export async function apiUpdateProducerCategory(producerCategory: Partial<ProducerCategory>): Promise<AxiosResponse<ApiResponse<{updateProducerCategory: ProducerCategory}>>> {
    const query = `
    mutation UpdateProducerCategory($documentId: ID!, $data: ProducerCategoryInput!) {
        updateProducerCategory(documentId: $documentId, data: $data) {
            documentId
            name
            producers (pagination: {limit: 100}){
                documentId
            }
        }
    }
  `,
  {documentId, ...data} = producerCategory,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateProducerCategory: ProducerCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete producer category
export type DeleteProducerCategoryResponse = {
    documentId: string
}

export async function apiDeleteProducerCategory(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteProducerCategory: DeleteProducerCategoryResponse}>>> {
    const query = `
    mutation DeleteProducerCategory($documentId: ID!) {
        deleteProducerCategory(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteProducerCategory: DeleteProducerCategoryResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}