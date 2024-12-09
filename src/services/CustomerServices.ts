import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IUser } from '@/@types/user'
import { DELETE_CUSTOMERS_API_URL, GET_CATEGORIES_CUSTOMERS_API_URL, GET_CUSTOMERS_API_URL, POST_CUSTOMERS_API_URL, PUT_CUSTOMERS_API_URL, PUT_CUSTOMERS_STATUS_API_URL } from '@/constants/api.constant'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { Customer, CustomerCategory } from '@/@types/customer'
import { AxiosResponse } from 'axios'

type CustomerResponse = {
    customers: IUser[]
    total: number
    result: string
    message: string
}

export interface ICategoryCustomer {
    _id: string
    label: string
    value: string
    customers: number
}

type CustomerCategoryResponse = {
    result: boolean
    total: number
    message: string
    categories: ICategoryCustomer[]
}

type CustomerCreateResponse = {
    result: boolean
    message: string
    customer: IUser
}

// get customers
export async function apiGetCustomersOld(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<CustomerResponse>({
        url: GET_CUSTOMERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create customer
export async function apiCreateCustomer(data: Record<string, unknown>) {
    return ApiService.fetchData<CustomerCreateResponse>({
        url: POST_CUSTOMERS_API_URL,
        method: 'post',
        data 
    })
}

// update customer
export async function apiUpdateCustomer(data: Record<string, unknown>) {
    return ApiService.fetchData<CustomerResponse>({
        url: PUT_CUSTOMERS_API_URL,
        method: 'put',
        data 
    })
}

// update status customer
export async function apiUpdateStatusCustomer(data: Record<string, unknown>) {
    return ApiService.fetchData<CustomerResponse>({
        url: PUT_CUSTOMERS_STATUS_API_URL,
        method: 'put',
        data 
    })
}

// get categories customers
export async function apiGetCategoriesCustomers(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<CustomerCategoryResponse>({
        url: GET_CATEGORIES_CUSTOMERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

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
    data
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