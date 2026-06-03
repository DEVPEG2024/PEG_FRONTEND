import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Quote } from '@/@types/quote'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'

const QUOTE_FIELDS = `
    documentId
    title
    status
    projectType
    quantity
    description
    desiredDeadline
    requestedByName
    requestedByEmail
    requestedByPhone
    proposalAmount
    proposalMessage
    proposedAt
    validatedAt
    createdAt
    customer { documentId name }
    proposalFile { documentId url name }
    project { documentId }
`

export type GetQuotesRequest = {
    pagination: PaginationRequest;
    searchTerm?: string;
};

export type GetQuotesResponse = {
    nodes: Quote[]
    pageInfo: PageInfo
};

// Toutes les demandes de devis (admin)
export async function apiGetQuotes(
    data: GetQuotesRequest = { pagination: { page: 1, pageSize: 1000 }, searchTerm: '' }
): Promise<AxiosResponse<ApiResponse<{ quotes_connection: GetQuotesResponse }>>> {
    const query = `
    query GetQuotes($searchTerm: String, $pagination: PaginationArg) {
        quotes_connection(filters: { title: { containsi: $searchTerm } }, pagination: $pagination, sort: "createdAt:desc") {
            nodes { ${QUOTE_FIELDS} }
            pageInfo { page pageCount pageSize total }
        }
    }`
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { searchTerm: data.searchTerm ?? '', pagination: data.pagination } },
    })
}

// Devis d'un client donné (côté client)
export async function apiGetCustomerQuotes(
    customerDocumentId: string
): Promise<AxiosResponse<ApiResponse<{ quotes_connection: GetQuotesResponse }>>> {
    const query = `
    query GetCustomerQuotes($customerDocumentId: ID!) {
        quotes_connection(
            filters: { customer: { documentId: { eq: $customerDocumentId } } },
            pagination: { page: 1, pageSize: 1000 },
            sort: "createdAt:desc"
        ) {
            nodes { ${QUOTE_FIELDS} }
            pageInfo { page pageCount pageSize total }
        }
    }`
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { customerDocumentId } },
    })
}

export type CreateQuoteRequest = {
    title?: string;
    status?: string;
    projectType?: string;
    quantity?: string;
    description: string;
    desiredDeadline?: string | null;
    requestedByName?: string | null;
    requestedByEmail?: string | null;
    requestedByPhone?: string | null;
    customer?: string | null;
};

export async function apiCreateQuote(
    data: CreateQuoteRequest
): Promise<AxiosResponse<ApiResponse<{ createQuote: Quote }>>> {
    const query = `
    mutation CreateQuote($data: QuoteInput!) {
        createQuote(data: $data) { ${QUOTE_FIELDS} }
    }`
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { data } },
    })
}

export async function apiUpdateQuote(
    documentId: string,
    data: Record<string, unknown>
): Promise<AxiosResponse<ApiResponse<{ updateQuote: Quote }>>> {
    const query = `
    mutation UpdateQuote($documentId: ID!, $data: QuoteInput!) {
        updateQuote(documentId: $documentId, data: $data) { ${QUOTE_FIELDS} }
    }`
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { documentId, data } },
    })
}
