// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

/**
 * Upload fichier (Strapi: /upload)
 * IMPORTANT: on ne met PAS /api ici, car ApiService gère déjà la baseURL.
 */
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  return ApiService.fetchData({
    url: `/upload`,
    method: 'post',
    data: formData,
  })
}

/**
 * LISTE CLIENTS
 * ✅ Version "zéro prise de tête" : on enlève populate/sort avancés.
 * ✅ On envoie DES PARAMS SIMPLES (page/pageSize/searchTerm) car ton backend renvoie 400 sur pagination[...]
 */
export const apiGetCustomers = (params: GetCustomersRequest) => {
  const page = params.pagination?.page ?? 1
  const pageSize = params.pagination?.pageSize ?? 10
  const searchTerm = (params.searchTerm ?? '').trim()

  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))
  if (searchTerm) query.set('search', searchTerm)

  return ApiService.fetchData({
    url: `/customers?${query.toString()}`,
    method: 'get',
  })
}

/**
 * GET ONE (édition)
 * On garde simple. Si ton backend est Strapi pur, il acceptera ?populate=deep
 * Si ton backend n'aime pas, on le retirera ensuite.
 */
export const apiGetCustomerForEditById = (id: string) => {
  return ApiService.fetchData({
    url: `/customers/${id}?populate=deep`,
    method: 'get',
  })
}

export const apiDeleteCustomer = (id: string) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'delete',
  })
}

/**
 * CREATE / UPDATE
 * ✅ Strapi attend souvent { data: {...} }
 * ✅ Mais certains backends attendent le payload direct.
 * 👉 On envoie {data: payload} (le plus standard Strapi) : si ton backend est custom, il le gère souvent aussi.
 */
export const apiCreateCustomer = (payload: any) => {
  return ApiService.fetchData({
    url: `/customers`,
    method: 'post',
    data: { data: payload },
  })
}

export const apiUpdateCustomer = (id: string, payload: any) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'put',
    data: { data: payload },
  })
}