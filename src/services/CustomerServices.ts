// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

export const apiGetCustomers = (params: GetCustomersRequest) => {
  const page = params.pagination?.page ?? 1
  const pageSize = params.pagination?.pageSize ?? 10
  const searchTerm = (params.searchTerm ?? '').trim()

  const query = new URLSearchParams()
  query.set('pagination[page]', String(page))
  query.set('pagination[pageSize]', String(pageSize))
  query.set('sort[0]', 'createdAt:desc')

  if (searchTerm) {
    query.set('filters[name][$containsi]', searchTerm)
  }

  query.set('populate[customerCategory]', 'true')

  return ApiService.fetchData({
    url: `/api/customers?${query.toString()}`,
    method: 'get',
  })
}

export const apiGetCustomerForEditById = (id: string) => {
  return ApiService.fetchData({
    url: `/api/customers/${id}?populate=deep`,
    method: 'get',
  })
}

export const apiDeleteCustomer = (id: string) => {
  return ApiService.fetchData({
    url: `/api/customers/${id}`,
    method: 'delete',
  })
}

export const apiCreateCustomer = (data: any) => {
  return ApiService.fetchData({
    url: `/api/customers`,
    method: 'post',
    data: { data },
  })
}

export const apiUpdateCustomer = (id: string, data: any) => {
  return ApiService.fetchData({
    url: `/api/customers/${id}`,
    method: 'put',
    data: { data },
  })
}