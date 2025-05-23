import { Invoice } from '@/@types/invoice';
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';

// create invoice
export type CreateInvoiceRequest = Omit<Invoice, "documentId">

export async function apiCreateInvoice(data: CreateInvoiceRequest): Promise<AxiosResponse<ApiResponse<{createInvoice: Invoice}>>> {
    const query = `
    mutation CreateInvoice($data: InvoiceInput!) {
        createInvoice(data: $data) {
            documentId
            orderItems (pagination: {limit: 100}){
                documentId
                product {
                    name
                }
                sizeAndColorSelections
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
            paymentDate
            paymentState
            paymentMethod
            date
            dueDate
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
        invoices_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                orderItems (pagination: {limit: 100}){
                    documentId
                    product {
                        name
                    }
                    sizeAndColorSelections
                    price
                }
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                amount
                vatAmount
                totalAmount
                name
                state
                paymentDate
                paymentState
                paymentMethod
                date
                dueDate
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

// get customer invoices
export type GetCustomerInvoicesRequest = {
    customerDocumentId: string;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export async function apiGetCustomerInvoices(data: GetCustomerInvoicesRequest = {customerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{invoices_connection: GetInvoicesResponse}>>> {
    const query = `
    query GetCustomerInvoices($customerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        invoices_connection(filters: {
            and: [
            {
                customer: {
                documentId: {eq: $customerDocumentId}
                }
            },
            {
                name: {containsi: $searchTerm}
            }
            ]
            }, pagination: $pagination) {
            nodes {
                documentId
                orderItems (pagination: {limit: 100}){
                    documentId
                    product {
                        name
                    }
                    sizeAndColorSelections
                    price
                }
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                amount
                vatAmount
                totalAmount
                name
                state
                paymentDate
                paymentState
                paymentMethod
                date
                dueDate
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
            orderItems (pagination: {limit: 100}){
                documentId
                product {
                    name
                }
                sizeAndColorSelections
                price
            }
            customer {
                documentId
                name
                companyInformations {
                    email
                    phoneNumber
                    siretNumber
                    vatNumber
                    zipCode
                    city
                    country
                    address
                }
            }
            amount
            vatAmount
            totalAmount
            name
            state
            paymentDate
            paymentState
            paymentMethod
            date
            dueDate
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