// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

// Strapi v4: /api/customers?pagination[page]=1&pagination[pageSize]=10&filters[name][$containsi]=abc
export const apiGetCustomers = (params: GetCustomersRequest) => {
  const page = params.pagination?.page ?? 1
  const pageSize = params.pagination?.pageSize ?? 10
  const searchTerm = (params.searchTerm ?? '').trim()

  const query = new URLSearchParams()
  query.set('pagination[page]', String(page))
  query.set('pagination[pageSize]', String(pageSize))

  // tri optionnel (tu peux enlever si tu veux)
  query.set('sort[0]', 'createdAt:desc')

  if (searchTerm) {
    // recherche sur "name" (adapte si ton champ s'appelle autrement)
    query.set('filters[name][$containsi]', searchTerm)
  }

  // populate customerCategory si tu en as besoin dans le tableau
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
  // Strapi attend souvent { data: {...} }
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