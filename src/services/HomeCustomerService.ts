import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IBanner } from '@/@types/banner';

export type CustomerCategory = {
  name: string,
  documentId: string
}

export type CustomerResponse = {
  banner?: IBanner,
  customer_category: any,
  documentId: string
}

// TODO: déplacer dans CustomerService
export async function apiGetCustomer(documentId: string) {
  return ApiService.fetchData<CustomerResponse>({
    url: `${API_BASE_URL}/customers/${documentId}`,
    method: "get",
  });
}