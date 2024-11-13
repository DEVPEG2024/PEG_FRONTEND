import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IBanner } from '@/@types/banner';
import { AxiosResponse } from 'axios';
import { ApiResponse } from '@/utils/serviceHelper';
import { CustomerCategory } from '@/@types/customer';


export type CustomerResponse = {
  banner?: IBanner,
  customer_category: CustomerCategory,
  documentId: string,
}

export async function apiGetCustomerREST(documentId: string): Promise<AxiosResponse<ApiResponse<CustomerResponse[]>>> {
  return ApiService.fetchData<ApiResponse<CustomerResponse[]>>({
    url: API_BASE_URL + '/customers?filters[documentId][$eq]=' + documentId + '&populate[customer_category][fields][0]=documentId&fields[0]=documentId&pagination[pageSize]=10&pagination[page]=1',
    method: 'get'
  })
}

// TODO: déplacer dans CustomerService
export async function apiGetCustomer(documentId: string): Promise<AxiosResponse<ApiResponse<{customer: CustomerResponse}>>> {
  const query = `
    query CustomerQuery($documentId: ID!) {
      customer(documentId: $documentId) {
        documentId
        customer_category {
          documentId
        }
      }
    }
  `,
  variables = {
    documentId
  }

  return ApiService.fetchData<ApiResponse<{customer: CustomerResponse}>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables
    }
  })
}