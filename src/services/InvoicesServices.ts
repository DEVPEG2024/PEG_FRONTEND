import { Invoice } from '@/@types/invoice';
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL, EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';

// create invoice
// `name` = le numéro de facture. Il est attribué par le SERVEUR : ne pas le
// renseigner pour une facture émise par PEG. Seul cas où il est transmis (et
// conservé) : le téléversement d'un PDF externe, dont on garde le nom de
// fichier — ce document reste hors de la séquence FAC-XXXX.
export type CreateInvoiceRequest = Omit<Invoice, "documentId" | "name"> & { name?: string }

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
            file {
                documentId
                url
                name
            }
        }
    }
  `,
  { customer: _c, orderItems: _o, ...invoiceData } = data,
  variables = {
    data: {
        ...invoiceData,
        customer: data.customer?.documentId,
        orderItems: data.orderItems?.map(({documentId}) => documentId) ?? [],
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
        invoices_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination, sort: ["createdAt:desc"]) {
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
                file {
                    documentId
                    url
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
            }, pagination: $pagination, sort: ["createdAt:desc"]) {
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
                file {
                    documentId
                    url
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
            file {
                documentId
                url
                name
            }
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

// Contrôle de cohérence de la séquence (admins).
// Répond à « comment sait-on que la numérotation est saine ? » autrement que
// par la confiance : doublons, trous, ruptures de chronologie.
export type NumberingReport = {
    series: string
    lastNumber: string | null
    counts: { inSeries: number; legacySeries: number; externalDocuments: number }
    duplicates: { name: string; count: number }[]
    missing: string[]
    chronologyIssues: { previous: string; current: string }[]
    allocatedUnused: { number: string; allocated_at: string; source: string }[]
    healthy: boolean
}

export async function apiGetNumberingReport(): Promise<NumberingReport> {
    const res = await ApiService.fetchData<NumberingReport>({
        url: `${EXPRESS_BACKEND_URL}/invoices/numbering-report`,
        method: 'get',
    })
    return res.data
}

// ⚠️ Le numéro de facture n'est PLUS calculé côté navigateur.
//
// Il l'était par un MAX()+1 sur les factures existantes, en même temps que NOVA
// faisait le même calcul de son côté : deux créations rapprochées lisaient le
// même maximum et produisaient le même numéro. Depuis, la séquence FAC-XXXX est
// attribuée de façon atomique par Strapi à l'insertion, pour TOUTES les sources
// (admin PEG, NOVA, Stripe, devis, paiement différé).
//
// Conséquence : ne jamais renseigner `name` à la création — le numéro réel est
// dans la réponse de `apiCreateInvoice`.
// Voir peg_strapi/src/services/invoice-numbering.service.ts.

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