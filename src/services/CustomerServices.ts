import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IUser } from '@/@types/user'
import { DELETE_CUSTOMERS_API_URL, GET_CATEGORIES_CUSTOMERS_API_URL, GET_CUSTOMERS_API_URL, POST_CUSTOMERS_API_URL, PUT_CUSTOMERS_API_URL, PUT_CUSTOMERS_STATUS_API_URL } from '@/constants/api.constant'

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
export async function apiGetCustomers(page: number, pageSize: number, searchTerm: string = "") {
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

// delete customer
export async function apiDeleteCustomer(data: Record<string, unknown>) {
    return ApiService.fetchData<CustomerResponse>({
        url: DELETE_CUSTOMERS_API_URL,
        method: 'delete',
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
