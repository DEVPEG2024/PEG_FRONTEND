import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { AxiosResponse } from 'axios';
import { ApiResponse } from '@/utils/serviceHelper';
import { Customer } from '@/@types/customer';

// TODO: déplacer dans CustomerService
export async function apiGetCustomer(documentId: string): Promise<AxiosResponse<ApiResponse<{customer: Customer}>>> {
  const query = `
    query CustomerQuery($documentId: ID!) {
      customer(documentId: $documentId) {
        documentId
        customerCategory {
          documentId
        }
        name
      }
    }
  `,
  variables = {
    documentId
  }

  return ApiService.fetchData<ApiResponse<{customer: Customer}>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables
    }
  })
}