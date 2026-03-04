// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

/**
 * IMPORTANT
 * - BaseURL ApiService contient déjà "/api"
 * - Donc ici on utilise "/customers" et PAS "/api/customers"
 * - Pagination Strapi: pagination[page] + pagination[pageSize]
 */
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

  // si tu affiches la catégorie dans la liste
  query.set('populate[customerCategory]', 'true')

  return ApiService.fetchData({
    url: `/customers?${query.toString()}`,
    method: 'get',
  })
}

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

export const apiCreateCustomer = (data: any) => {
  return ApiService.fetchData({
    url: `/customers`,
    method: 'post',
    data: { data },
  })
}

export const apiUpdateCustomer = (id: string, data: any) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'put',
    data: { data },
  })
}

/**
 * Upload Strapi: POST /upload (baseURL contient /api)
 * FormData: files
 */
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  return ApiService.fetchData({
    url: `/upload`,
    method: 'post',
    data: formData,
    // si ton ApiService gère auto le multipart, tu peux enlever headers
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}