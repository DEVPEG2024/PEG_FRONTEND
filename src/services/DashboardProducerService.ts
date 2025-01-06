import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { AxiosResponse } from 'axios';
import { ApiResponse } from '@/utils/serviceHelper';
import { Producer } from '@/@types/producer';

export async function apiGetDashboardProducerInformations(documentId: string): Promise<AxiosResponse<ApiResponse<{producer: Producer}>>> {
  const query = `
    query DashboardProducerInformationsQuery($documentId: ID!) {
      producer(documentId: $documentId) {
        documentId
        name
        projects {
          documentId
          name
          customer {
            documentId
            name
          }
          producerPrice
          startDate
          endDate
          state
          tasks {
            documentId
            state
          }
        }
      }
    }
  `,
  variables = {
    documentId
  }

  return ApiService.fetchData<ApiResponse<{producer: Producer}>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables
    }
  })
}