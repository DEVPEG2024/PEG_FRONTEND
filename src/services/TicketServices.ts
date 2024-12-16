import ApiService from './ApiService'
import { Ticket } from '@/@types/ticket';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// get tickets
export type GetTicketsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetTicketsResponse = {
    nodes: Ticket[]
    pageInfo: PageInfo
};

export async function apiGetTickets(data: GetTicketsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{tickets_connection: GetTicketsResponse}>>> {
    const query = `
    query GetTickets($searchTerm: String, $pagination: PaginationArg) {
        tickets_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                description
                state
                priority
                image {
                    documentId
                    url
                    name
                }
                user {
                    documentId
                    firstName
                    lastName
                }
                type
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
    return ApiService.fetchData<ApiResponse<{tickets_connection: GetTicketsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get ticket for edit by id
export async function apiGetTicketForEditById(documentId: string): Promise<AxiosResponse<ApiResponse<{ticket: Ticket}>>> {
    const query = `
    query GetTicketForEditById($documentId: ID!) {
        ticket(documentId: $documentId) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{ticket: Ticket}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update ticket
export async function apiUpdateTicket(ticket: Partial<Ticket>): Promise<AxiosResponse<ApiResponse<{updateTicket: Ticket}>>> {
    const query = `
    mutation UpdateTicket($documentId: ID!, $data: TicketInput!) {
        updateTicket(documentId: $documentId, data: $data) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,
  {documentId, ...data} = ticket,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateTicket: Ticket}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create ticket
export type CreateTicketRequest = Omit<Ticket, "documentId">

export async function apiCreateTicket(data: CreateTicketRequest): Promise<AxiosResponse<ApiResponse<{createTicket: Ticket}>>> {
    const query = `
    mutation CreateTicket($data: TicketInput!) {
        createTicket(data: $data) {
            documentId
            name
            description
            state
            priority
            image {
                documentId
                url
                name
            }
            user {
                documentId
                firstName
                lastName
            }
            type
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createTicket: Ticket}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete ticket
export type DeleteTicketResponse = {
    documentId: string
}

export async function apiDeleteTicket(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteTicket: DeleteTicketResponse}>>> {
    const query = `
    mutation DeleteTicket($documentId: ID!) {
        deleteTicket(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteTicket: DeleteTicketResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}