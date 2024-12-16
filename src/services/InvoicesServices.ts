import { Invoice, InvoiceOld } from '@/@types/invoice';
import ApiService from './ApiService'
import {
    DELETE_INVOICES_API_URL,
  GET_INVOICES_API_URL,
  GET_INVOICES_BY_USER_ID_API_URL,
  POST_INVOICES_API_URL,
  PUT_INVOICES_API_URL,
  PUT_INVOICES_STATUS_API_URL,
} from "@/constants/api.constant";
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';

// TODO: Services
type InvoicesResponse = {
  invoices: InvoiceOld[];
  total: number;
  result: string;
  message: string;
};



type InvoicesCreateResponse = {
    result: boolean
    message: string
    invoice: InvoiceOld
}

type InvoicesDeleteResponse = {
    invoiceId: string
    result: boolean
    message: string
}

// get invoices
export async function apiGetInvoicesOld(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<InvoicesResponse>({
        url: GET_INVOICES_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create invoice
export async function apiCreateInvoiceOld(data: Record<string, unknown>) {
    return ApiService.fetchData<InvoicesCreateResponse>({
        url: POST_INVOICES_API_URL,
        method: 'post',
        data 
    })
}

// update invoice
export async function apiUpdateInvoiceOld(data: Record<string, unknown>) {
    return ApiService.fetchData<InvoicesCreateResponse>({
        url: PUT_INVOICES_API_URL +'/' + data.invoiceId,
        method: 'put',
        data 
    })
}

// update status invoice
export async function apiUpdateStatusInvoice(data: Record<string, unknown>) {
    return ApiService.fetchData<InvoicesResponse>({
        url: PUT_INVOICES_STATUS_API_URL,
        method: 'put',
        data 
    })
}

// delete invoice
export async function apiDeleteInvoiceOld(data: Record<string, unknown>) {
    return ApiService.fetchData<InvoicesDeleteResponse>({
        url: DELETE_INVOICES_API_URL + '/' + data._id,
        method: 'delete',
        data 
    })
}

// get invoice by user id
export async function apiGetInvoiceByUserId(page: number, pageSize: number, searchTerm: string = "", userId: string = "") {
    return ApiService.fetchData<InvoicesResponse>({
        url: GET_INVOICES_BY_USER_ID_API_URL,
        params: { page, pageSize, searchTerm, userId },
        method: 'get'
    })
}

// create invoice
export type CreateInvoiceRequest = Omit<Invoice, "documentId">

export async function apiCreateInvoice(data: CreateInvoiceRequest): Promise<AxiosResponse<ApiResponse<{createInvoice: Invoice}>>> {
    const query = `
    mutation CreateInvoice($data: InvoiceInput!) {
        createInvoice(data: $data) {
            documentId
            orderItems {
                documentId
                product {
                    name
                }
                sizeSelections
                price
            }
            customer {
                documentId
                name
            }
            amount
            vatAmount
            totalAmount
            name
            state
            paymentState
            paymentMethod
        }
    }
  `,
  variables = {
    data: {
        ...data,
        customer: data.customer.documentId,
        orderItems: data.orderItems.map(({documentId}) => documentId)
    }
  }
    return ApiService.fetchData<ApiResponse<{createInvoice: Invoice}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get invoices
export type GetInvoicesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetInvoicesResponse = {
    nodes: Invoice[]
    pageInfo: PageInfo
};

export async function apiGetInvoices(data: GetInvoicesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{invoices_connection: GetInvoicesResponse}>>> {
    const query = `
    query GetInvoices($searchTerm: String, $pagination: PaginationArg) {
        invoices_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                orderItems {
                    documentId
                    product {
                        name
                    }
                    sizeSelections
                    price
                }
                customer {
                    documentId
                    name
                }
                amount
                vatAmount
                totalAmount
                name
                state
                paymentState
                paymentMethod
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
    return ApiService.fetchData<ApiResponse<{invoices_connection: GetInvoicesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update invoice
export async function apiUpdateInvoice(invoice: Partial<Invoice>): Promise<AxiosResponse<ApiResponse<{updateInvoice: Invoice}>>> {
    const query = `
    mutation UpdateInvoice($documentId: ID!, $data: InvoiceInput!) {
        updateInvoice(documentId: $documentId, data: $data) {
            documentId
            orderItems {
                documentId
                product {
                    name
                }
                sizeSelections
                price
            }
            customer {
                documentId
                name
            }
            amount
            vatAmount
            totalAmount
            name
            state
            paymentState
            paymentMethod
        }
    }
  `,
  {documentId, ...data} = invoice,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateInvoice: Invoice}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete invoice
export type DeleteInvoiceResponse = {
    documentId: string
}

export async function apiDeleteInvoice(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteInvoice: DeleteInvoiceResponse}>>> {
    const query = `
    mutation DeleteInvoice($documentId: ID!) {
        deleteInvoice(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteInvoice: DeleteInvoiceResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}