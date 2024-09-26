import { Invoice } from '@/@types/invoice';
import ApiService from './ApiService'
import {
    DELETE_INVOICES_API_URL,
  GET_INVOICES_API_URL,
  GET_INVOICES_BY_USER_ID_API_URL,
  POST_INVOICES_API_URL,
  PUT_INVOICES_API_URL,
  PUT_INVOICES_STATUS_API_URL,
} from "@/constants/api.constant";

type InvoicesResponse = {
  invoices: Invoice[];
  total: number;
  result: string;
  message: string;
};



type InvoicesCreateResponse = {
    result: boolean
    message: string
    invoice: Invoice
}

type InvoicesDeleteResponse = {
    invoiceId: string
    result: boolean
    message: string
}

// get invoices
export async function apiGetInvoices(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<InvoicesResponse>({
        url: GET_INVOICES_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create invoice
export async function apiCreateInvoice(data: Record<string, unknown>) {
    return ApiService.fetchData<InvoicesCreateResponse>({
        url: POST_INVOICES_API_URL,
        method: 'post',
        data 
    })
}

// update invoice
export async function apiUpdateInvoice(data: Record<string, unknown>) {
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
export async function apiDeleteInvoice(data: Record<string, unknown>) {
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
