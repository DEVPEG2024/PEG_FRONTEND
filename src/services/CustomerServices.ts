import ApiService from './ApiService'
import { ApiResponse } from '@/utils/serviceHelper'
import { Customer } from '@/@types/customer'

/**
 * Types attendus par le store (customersSlice.ts)
 */
export type GetCustomersRequest = {
  pagination: { page: number; pageSize: number }
  searchTerm?: string
}

export type GetCustomersResponse = ApiResponse<{
  data: Customer[]
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}>

export type GetCustomerForEditByIdResponse = ApiResponse<{
  data: Customer
}>

export type DeleteCustomerResponse = ApiResponse<{
  data: any
}>

/**
 * ✅ LISTE CLIENTS (export manquant qui fait crasher le build)
 * NOTE: URL Strapi v4 classique: /customers
 * On ajoute une recherche simple si "searchTerm" est fourni.
 */
export async function apiGetCustomers(data: GetCustomersRequest) {
  const { pagination, searchTerm } = data

  // Strapi pagination
  const params: any = {
    'pagination[page]': pagination.page,
    'pagination[pageSize]': pagination.pageSize,
    // populate minimal (à ajuster si besoin)
    populate: '*',
    sort: 'createdAt:desc',
  }

  // Recherche Strapi : filtre sur name (containsi)
  if (searchTerm && searchTerm.trim().length > 0) {
    params['filters[name][$containsi]'] = searchTerm.trim()
  }

  return ApiService.fetchData<GetCustomersResponse>({
    url: '/customers',
    method: 'get',
    params,
  })
}

/**
 * ✅ GET 1 client pour édition
 */
export async function apiGetCustomerForEditById(documentId: string) {
  return ApiService.fetchData<GetCustomerForEditByIdResponse>({
    url: `/customers/${documentId}`,
    method: 'get',
    params: {
      populate: '*',
    },
  })
}

/**
 * ✅ DELETE client
 */
export async function apiDeleteCustomer(documentId: string) {
  return ApiService.fetchData<DeleteCustomerResponse>({
    url: `/customers/${documentId}`,
    method: 'delete',
  })
}

/**
 * (Optionnel mais utile) CREATE / UPDATE
 * Si ton store les utilise plus tard, tu es tranquille.
 */
export async function apiCreateCustomer(payload: any) {
  return ApiService.fetchData<ApiResponse<{ data: Customer }>>({
    url: '/customers',
    method: 'post',
    data: { data: payload },
  })
}

export async function apiUpdateCustomer(documentId: string, payload: any) {
  return ApiService.fetchData<ApiResponse<{ data: Customer }>>({
    url: `/customers/${documentId}`,
    method: 'put',
    data: { data: payload },
  })
}