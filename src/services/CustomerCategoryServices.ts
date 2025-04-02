import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { CustomerCategory } from '@/@types/customer'
import { AxiosResponse } from 'axios'

// get customer categories
export type GetCustomerCategoriesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetCustomerCategoriesResponse = {
    nodes: CustomerCategory[]
    pageInfo: PageInfo
};

export async function apiGetCustomerCategories(data: GetCustomerCategoriesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{customerCategories_connection: GetCustomerCategoriesResponse}>>> {
    const query = `
    query GetCustomerCategories($searchTerm: String, $pagination: PaginationArg) {
        customerCategories_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                customers {
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
    return ApiService.fetchData<ApiResponse<{customerCategories_connection: GetCustomerCategoriesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create customer category
export type CreateCustomerCategoryRequest = Omit<CustomerCategory, "documentId">

export async function apiCreateCustomerCategory(data: CreateCustomerCategoryRequest): Promise<AxiosResponse<ApiResponse<{createCustomerCategory: CustomerCategory}>>> {
    const query = `
    mutation CreateCustomerCategory($data: CustomerCategoryInput!) {
        createCustomerCategory(data: $data) {
            documentId
            name
            customers {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createCustomerCategory: CustomerCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update customer category
export async function apiUpdateCustomerCategory(customerCategory: Partial<CustomerCategory>): Promise<AxiosResponse<ApiResponse<{updateCustomerCategory: CustomerCategory}>>> {
    const query = `
    mutation UpdateCustomerCategory($documentId: ID!, $data: CustomerCategoryInput!) {
        updateCustomerCategory(documentId: $documentId, data: $data) {
            documentId
            name
            customers {
                documentId
                name
            }
        }
    }
  `,
  {documentId, ...data} = customerCategory,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateCustomerCategory: CustomerCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete customer category
export type DeleteCustomerCategoryResponse = {
    documentId: string
}

export async function apiDeleteCustomerCategory(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteCustomerCategory: DeleteCustomerCategoryResponse}>>> {
    const query = `
    mutation DeleteCustomerCategory($documentId: ID!) {
        deleteCustomerCategory(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteCustomerCategory: DeleteCustomerCategoryResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}