import ApiService from '@/services/ApiService'

// ✅ LIST (si tu as déjà, garde le tien)
export async function getCustomers(params: any) {
  return ApiService.fetchData({
    url: '/customers',
    method: 'get',
    params,
  })
}

// ✅ CREATE : multipart/form-data
export async function createCustomer(formData: FormData) {
  return ApiService.fetchData({
    url: '/customers',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

// ✅ UPDATE : multipart/form-data
export async function updateCustomer(documentId: string, formData: FormData) {
  return ApiService.fetchData({
    url: `/customers/${documentId}`,
    method: 'put',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}