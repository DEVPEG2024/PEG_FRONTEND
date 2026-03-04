// src/services/CustomerServices.ts
import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

// --------- helpers ----------
const is400 = (e: any) => e?.response?.status === 400

const pickUploadFileId = (uploadRes: any) => {
  // selon impl: {data:[{id}]} ou {data:{data:[{id}]}}
  return uploadRes?.data?.[0]?.id ?? uploadRes?.data?.data?.[0]?.id ?? null
}

// --------- upload ----------
export const apiUploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  // Strapi: POST /upload (souvent sous /api déjà dans baseURL)
  return ApiService.fetchData({
    url: `/upload`,
    method: 'post',
    data: formData,
  })
}

// --------- customers ----------
export const apiGetCustomers = async (params: GetCustomersRequest) => {
  const page = params.pagination?.page ?? 1
  const pageSize = params.pagination?.pageSize ?? 10
  const searchTerm = (params.searchTerm ?? '').trim()

  // Format A (API custom fréquent)
  const qA = new URLSearchParams()
  qA.set('page', String(page))
  qA.set('pageSize', String(pageSize))
  if (searchTerm) qA.set('search', searchTerm)

  // Format B (Strapi v4 standard)
  const qB = new URLSearchParams()
  qB.set('pagination[page]', String(page))
  qB.set('pagination[pageSize]', String(pageSize))
  if (searchTerm) qB.set('filters[name][$containsi]', searchTerm)
  // populate category si besoin
  qB.set('populate[customerCategory]', 'true')

  // 1) essai format A
  try {
    return await ApiService.fetchData({
      url: `/customers?${qA.toString()}`,
      method: 'get',
    })
  } catch (e: any) {
    if (!is400(e)) throw e
  }

  // 2) essai format B (Strapi)
  try {
    return await ApiService.fetchData({
      url: `/customers?${qB.toString()}`,
      method: 'get',
    })
  } catch (e: any) {
    if (!is400(e)) throw e
  }

  // 3) dernier essai Strapi mais SANS populate (certains backends refusent populate[])
  const qB2 = new URLSearchParams()
  qB2.set('pagination[page]', String(page))
  qB2.set('pagination[pageSize]', String(pageSize))
  if (searchTerm) qB2.set('filters[name][$containsi]', searchTerm)

  return ApiService.fetchData({
    url: `/customers?${qB2.toString()}`,
    method: 'get',
  })
}

export const apiGetCustomerForEditById = async (id: string) => {
  // 1) essai avec populate deep (Strapi)
  try {
    return await ApiService.fetchData({
      url: `/customers/${id}?populate=deep`,
      method: 'get',
    })
  } catch (e: any) {
    if (!is400(e)) throw e
  }

  // 2) fallback sans populate (API custom)
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'get',
  })
}

export const apiDeleteCustomer = async (id: string) => {
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'delete',
  })
}

export const apiCreateCustomer = async (payload: any) => {
  // 1) Strapi standard {data:{...}}
  try {
    return await ApiService.fetchData({
      url: `/customers`,
      method: 'post',
      data: { data: payload },
    })
  } catch (e: any) {
    if (!is400(e)) throw e
  }

  // 2) fallback API custom payload direct
  return ApiService.fetchData({
    url: `/customers`,
    method: 'post',
    data: payload,
  })
}

export const apiUpdateCustomer = async (id: string, payload: any) => {
  // 1) Strapi standard {data:{...}}
  try {
    return await ApiService.fetchData({
      url: `/customers/${id}`,
      method: 'put',
      data: { data: payload },
    })
  } catch (e: any) {
    if (!is400(e)) throw e
  }

  // 2) fallback API custom payload direct
  return ApiService.fetchData({
    url: `/customers/${id}`,
    method: 'put',
    data: payload,
  })
}