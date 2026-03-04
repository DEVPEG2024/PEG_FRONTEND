import ApiService from './ApiService'

export type GetCustomersRequest = {
  pagination?: { page: number; pageSize: number }
  page?: number
  pageSize?: number
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

export const apiGetCustomers = (params: GetCustomersRequest) => {
  const page =
    params.pagination?.page ??
    params.page ??
    1

  const pageSize =
    params.pagination?.pageSize ??
    params.pageSize ??
    10

  const searchTerm = (params.searchTerm ?? '').trim()

  const query = new URLSearchParams()

  query.set('pagination[page]', String(page))
  query.set('pagination[pageSize]', String(pageSize))
  query.set('sort[0]', 'createdAt:desc')

  if (searchTerm) {
    query.set('filters[name][$containsi]', searchTerm)
  }

  // populate uniquement ce qui existe dans Strapi
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