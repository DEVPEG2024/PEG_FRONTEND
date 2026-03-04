// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

// ✅ UPLOAD (Strapi /upload)
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  return ApiService.fetchData({
    url: '/upload',
    method: 'post',
    data: formData,
    // important: laisser le browser mettre le bon boundary
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ✅ GET LIST (Strapi v4)
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

  // si ton tableau a besoin de la catégorie
  query.set('populate[customerCategory]', 'true')

  return ApiService.fetchData({
    url: `/customers?${query.toString()}`,
    method: 'get',
  })
}

// ✅ GET ONE (edit)
export const apiGetCustomerForEditById = (id: string) => {
  return ApiService.fetchData({
    url: `/customers/${id}?populate=deep`,
    method: 'get',
  })
}

// ✅ DELETE
export const apiDeleteCustomer = (id: string) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'delete',
  })
}

// ✅ CREATE (Strapi attend { data: {...} })
export const apiCreateCustomer = (data: any) => {
  return ApiService.fetchData({
    url: `/customers`,
    method: 'post',
    data: { data },
  })
}

// ✅ UPDATE
export const apiUpdateCustomer = (id: string, data: any) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'put',
    data: { data },
  })
}