import ApiService from './ApiService'
import { ApiResponse, PaginationRequest, PageInfo } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'
import { API_GRAPHQL_URL } from '@/configs/api.config'
import { CalendarEvent } from '@/@types/calendarEvent'

// ─── Types ─────────────────────────────────────────────────────────────────
export type GetCalendarEventsRequest = {
    pagination?: PaginationRequest
}

export type GetCalendarEventsResponse = {
    nodes: CalendarEvent[]
    pageInfo: PageInfo
}

const CALENDAR_EVENT_FIELDS = `
    documentId
    title
    description
    startDate
    endDate
    category
    allDay
    recurrence
    recurrenceEnd
    reminderMinutes
    googleEventId
    project { documentId name }
`

// ─── GET all events ────────────────────────────────────────────────────────
export async function apiGetCalendarEvents(
    data: GetCalendarEventsRequest = { pagination: { page: 1, pageSize: 1000 } }
): Promise<AxiosResponse<ApiResponse<{ calendarEvents_connection: GetCalendarEventsResponse }>>> {
    const query = `
    query getCalendarEvents($pagination: PaginationArg) {
        calendarEvents_connection(pagination: $pagination, sort: "startDate:asc") {
            nodes { ${CALENDAR_EVENT_FIELDS} }
            pageInfo { page pageCount pageSize total }
        }
    }`
    return ApiService.fetchData<ApiResponse<{ calendarEvents_connection: GetCalendarEventsResponse }>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { ...data } },
    })
}

// ─── CREATE event ──────────────────────────────────────────────────────────
export type CreateCalendarEventRequest = Omit<CalendarEvent, 'documentId' | 'createdAt' | 'updatedAt'>

export async function apiCreateCalendarEvent(
    data: CreateCalendarEventRequest
): Promise<AxiosResponse<ApiResponse<{ createCalendarEvent: CalendarEvent }>>> {
    const query = `
    mutation CreateCalendarEvent($data: CalendarEventInput!) {
        createCalendarEvent(data: $data) {
            ${CALENDAR_EVENT_FIELDS}
        }
    }`
    return ApiService.fetchData<ApiResponse<{ createCalendarEvent: CalendarEvent }>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { data } },
    })
}

// ─── UPDATE event ──────────────────────────────────────────────────────────
export async function apiUpdateCalendarEvent(
    event: Partial<CalendarEvent> & { documentId: string }
): Promise<AxiosResponse<ApiResponse<{ updateCalendarEvent: CalendarEvent }>>> {
    const { documentId, ...rest } = event
    const query = `
    mutation UpdateCalendarEvent($documentId: ID!, $data: CalendarEventInput!) {
        updateCalendarEvent(documentId: $documentId, data: $data) {
            ${CALENDAR_EVENT_FIELDS}
        }
    }`
    return ApiService.fetchData<ApiResponse<{ updateCalendarEvent: CalendarEvent }>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { documentId, data: rest } },
    })
}

// ─── DELETE event ──────────────────────────────────────────────────────────
export async function apiDeleteCalendarEvent(
    documentId: string
): Promise<AxiosResponse<ApiResponse<{ deleteCalendarEvent: { documentId: string } }>>> {
    const query = `
    mutation DeleteCalendarEvent($documentId: ID!) {
        deleteCalendarEvent(documentId: $documentId) {
            documentId
        }
    }`
    return ApiService.fetchData<ApiResponse<{ deleteCalendarEvent: { documentId: string } }>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { documentId } },
    })
}
