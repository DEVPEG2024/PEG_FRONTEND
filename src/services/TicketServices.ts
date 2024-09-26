import ApiService from './ApiService'
import {
  DELETE_TICKETS_API_URL,
  GET_TICKETS_API_URL,
  POST_TICKETS_API_URL,
  PUT_TICKETS_API_URL,
  PUT_TICKETS_STATUS_API_URL,
} from "@/constants/api.constant";
import { ITicket } from '@/@types/ticket';

type TicketsResponse = {
  tickets: ITicket[];
  total: number;
  result: string;
  message: string;
};

type TicketResponse = {
  ticket: ITicket;
  ticketId: string;
};

type TicketsCreateResponse = {
    result: boolean
    message: string
    ticket: ITicket
}

type TicketsDeleteResponse = {
    ticketId: string
    result: boolean
    message: string
}

// get tickets
export async function apiGetTickets(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<TicketsResponse>({
        url: GET_TICKETS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create invoice
export async function apiCreateTicket(data: Record<string, unknown>) {
    return ApiService.fetchData<TicketsCreateResponse>({
        url: POST_TICKETS_API_URL,
        method: 'post',
        data 
    })
}

// update invoice
export async function apiUpdateTicket(data: Record<string, unknown>) {
        return ApiService.fetchData<TicketsCreateResponse>({
        url: PUT_TICKETS_API_URL +'/' + data.ticketId,
        method: 'put',
        data 
    })
}

// update status invoice
export async function apiUpdateStatusTicket(data: Record<string, unknown>) {
    return ApiService.fetchData<TicketResponse>({
        url: PUT_TICKETS_STATUS_API_URL + '/' + data.ticketId,
        method: 'put',
        data 
    })
}

// update priority ticket
export async function apiUpdatePriorityTicket(data: Record<string, unknown>) {
    return ApiService.fetchData<TicketResponse>({
        url: PUT_TICKETS_STATUS_API_URL + '/' + data.ticketId,
        method: 'put',
        data 
    })
}

// delete invoice
export async function apiDeleteTicket(data: Record<string, unknown>) {
        return ApiService.fetchData<TicketsDeleteResponse>({
        url: DELETE_TICKETS_API_URL + '/' + data.ticketId,
        method: 'delete',
    })
}
