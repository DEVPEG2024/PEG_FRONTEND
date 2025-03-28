import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { Producer } from '@/@types/producer'
import { AxiosResponse } from 'axios'

// get producers
export type GetProducersRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProducersResponse = {
    nodes: Producer[]
    pageInfo: PageInfo
};

export async function apiGetProducers(data: GetProducersRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{producers_connection: GetProducersResponse}>>> {
    const query = `
    query GetProducers($searchTerm: String, $pagination: PaginationArg) {
        producers_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                producerCategory {
                    documentId
                    name
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{producers_connection: GetProducersResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete producer
export type DeleteProducerResponse = {
    documentId: string
}

export async function apiDeleteProducer(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteProducer: DeleteProducerResponse}>>> {
    const query = `
    mutation DeleteProducer($documentId: ID!) {
        deleteProducer(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteProducer: DeleteProducerResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get producer for edit by id
export async function apiGetProducerForEditById(documentId: string): Promise<AxiosResponse<ApiResponse<{producer: Producer}>>> {
    const query = `
    query GetProducerForEditById($documentId: ID!) {
        producer(documentId: $documentId) {
            documentId
            producerCategory {
                documentId
                name
            }
            companyInformations {
                email
                phoneNumber
                siretNumber
                vatNumber
                website
                zipCode
                city
                country
                address
            }
            name
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

// create producer
export type CreateProducerRequest = Omit<Producer, "documentId">

export async function apiCreateProducer(data: CreateProducerRequest): Promise<AxiosResponse<ApiResponse<{createProducer: Producer}>>> {
    const query = `
    mutation CreateProducer($data: ProducerInput!) {
        createProducer(data: $data) {
            documentId
            name
            producerCategory {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createProducer: Producer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update producer
export async function apiUpdateProducer(producer: Partial<Producer>): Promise<AxiosResponse<ApiResponse<{updateProducer: Producer}>>> {
    const query = `
    mutation UpdateProducer($documentId: ID!, $data: ProducerInput!) {
        updateProducer(documentId: $documentId, data: $data) {
            documentId
            name
            producerCategory {
                documentId
                name
            }
        }
    }
  `,
  {documentId, ...data} = producer,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateProducer: Producer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}