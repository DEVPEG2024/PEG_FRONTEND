// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

/**
 * IMPORTANT:
 * - Strapi v4 pagination: pagination[page] & pagination[pageSize]
 * - On évite populate[logo] etc (ça casse si le champ s'appelle autrement) => populate=*
 * - Dans ton app, tu navigues avec documentId (string). Or Strapi default PUT/DELETE attend l'id numérique.
 *   => on résout documentId -> id avant update/delete
 */

// Helpers
const buildCustomersListQuery = (params: GetCustomersRequest) => {
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

  // Robust Strapi populate
  query.set('populate', '*')

  return query.toString()
}

const buildByDocumentIdQuery = (documentId: string) => {
  const query = new URLSearchParams()
  query.set('filters[documentId][$eq]', documentId)
  query.set('pagination[page]', '1')
  query.set('pagination[pageSize]', '1')
  query.set('populate', '*')
  return query.toString()
}

// GET list
export const apiGetCustomers = (params: GetCustomersRequest) => {
  const qs = buildCustomersListQuery(params)
  return ApiService.fetchData({
    url: `/customers?${qs}`,
    method: 'get',
  })
}

// GET one by documentId (robuste avec ton routing /edit/:documentId)
export const apiGetCustomerForEditByDocumentId = (documentId: string) => {
  const qs = buildByDocumentIdQuery(documentId)
  return ApiService.fetchData({
    url: `/customers?${qs}`,
    method: 'get',
  })
}

// Resolve documentId -> numeric id
export const apiResolveCustomerIdFromDocumentId = async (documentId: string): Promise<number> => {
  const res: any = await apiGetCustomerForEditByDocumentId(documentId)
  const arr = res?.data?.data ?? res?.data ?? []
  const first = Array.isArray(arr) ? arr[0] : null
  const id = first?.id
  if (!id) {
    throw new Error(`Customer not found for documentId=${documentId}`)
  }
  return id
}

// DELETE by documentId
export const apiDeleteCustomerByDocumentId = async (documentId: string) => {
  const numericId = await apiResolveCustomerIdFromDocumentId(documentId)
  return ApiService.fetchData({
    url: `/customers/${numericId}`,
    method: 'delete',
  })
}

// CREATE
export const apiCreateCustomer = (data: any) => {
  return ApiService.fetchData({
    url: `/customers`,
    method: 'post',
    data: { data },
  })
}

// UPDATE by documentId
export const apiUpdateCustomerByDocumentId = async (documentId: string, data: any) => {
  const numericId = await apiResolveCustomerIdFromDocumentId(documentId)
  return ApiService.fetchData({
    url: `/customers/${numericId}`,
    method: 'put',
    data: { data },
  })
}

// UPLOAD (Strapi)
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  return ApiService.fetchData({
    url: `/upload`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}