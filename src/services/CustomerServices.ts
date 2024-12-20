import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { Customer } from '@/@types/customer'
import { AxiosResponse } from 'axios'

// get customers
export type GetCustomersRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetCustomersResponse = {
    nodes: Customer[]
    pageInfo: PageInfo
};

export async function apiGetCustomers(data: GetCustomersRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{customers_connection: GetCustomersResponse}>>> {
    const query = `
    query GetCustomers($searchTerm: String, $pagination: PaginationArg) {
        customers_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                customerCategory {
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
    return ApiService.fetchData<ApiResponse<{customers_connection: GetCustomersResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete customer
export type DeleteCustomerResponse = {
    documentId: string
}

export async function apiDeleteCustomer(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteCustomer: DeleteCustomerResponse}>>> {
    const query = `
    mutation DeleteCustomer($documentId: ID!) {
        deleteCustomer(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteCustomer: DeleteCustomerResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get customer for edit by id
export async function apiGetCustomerForEditById(documentId: string): Promise<AxiosResponse<ApiResponse<{customer: Customer}>>> {
    const query = `
    query GetCustomerForEditById($documentId: ID!) {
        customer(documentId: $documentId) {
            documentId
            banner {
                documentId
                name
            }
            customerCategory {
                documentId
                name
            }
            companyInformations {
                email
                phoneNumber
                siretNumber
                vatNumber
                website
                zipCode
                city
                country
                address
            }
            name
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{customer: Customer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create customer
export type CreateCustomerRequest = Omit<Customer, "documentId">

export async function apiCreateCustomer(data: CreateCustomerRequest): Promise<AxiosResponse<ApiResponse<{createCustomer: Customer}>>> {
    const query = `
    mutation CreateCustomer($data: CustomerInput!) {
        createCustomer(data: $data) {
            documentId
            name
            customerCategory {
                documentId
                name
            }
            banner {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createCustomer: Customer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update customer
export async function apiUpdateCustomer(customer: Partial<Customer>): Promise<AxiosResponse<ApiResponse<{updateCustomer: Customer}>>> {
    const query = `
    mutation UpdateCustomer($documentId: ID!, $data: CustomerInput!) {
        updateCustomer(documentId: $documentId, data: $data) {
            documentId
            name
            customerCategory {
                documentId
                name
            }
            banner {
                documentId
                name
            }
        }
    }
  `,
  {documentId, ...data} = customer,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateCustomer: Customer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}