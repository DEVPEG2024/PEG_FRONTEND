import ApiService from './ApiService'

export type GetCustomersRequest = {
  // format Strapi
  pagination?: { page: number; pageSize: number }
  // format legacy (ce qui te casse aujourd’hui)
  page?: number
  pageSize?: number
  searchTerm?: string
}

export type DeleteCustomerResponse = unknown

/**
 * Strapi attend:
 * /customers?pagination[page]=1&pagination[pageSize]=10
 * On accepte aussi l'ancien format page/pageSize et on le convertit.
 */
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

  // adapte si tu as besoin d'autres relations
  query.set('populate[customerCategory]', 'true')
  query.set('populate[logo]', 'true')

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
 * Upload Strapi
 * baseURL ApiService = .../api  => ici c'est /upload
 */
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)

  return ApiService.fetchData({
    url: `/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}