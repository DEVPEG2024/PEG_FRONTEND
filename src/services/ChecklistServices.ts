import ApiService from './ApiService'
import { Checklist } from '@/@types/checklist'
import { AxiosResponse } from 'axios';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// create checklist
export type CreateChecklistRequest = Omit<Checklist, 'documentId'>

export async function apiCreateChecklist(data: CreateChecklistRequest): Promise<AxiosResponse<ApiResponse<{createChecklist: Checklist}>>> {
    const query = `
    mutation CreateChecklist($data: ChecklistInput!) {
        createChecklist(data: $data) {
            documentId
            name
            items
        }
    }
  `,
  variables = { data }
    return ApiService.fetchData<ApiResponse<{createChecklist: Checklist}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// update checklist
export async function apiUpdateChecklist(checklist: Partial<Checklist>): Promise<AxiosResponse<ApiResponse<{updateChecklist: Checklist}>>> {
    const query = `
    mutation UpdateChecklist($documentId: ID!, $data: ChecklistInput!) {
        updateChecklist(documentId: $documentId, data: $data) {
            documentId
            name
            items
        }
    }
  `,
  {documentId, ...data} = checklist,
  variables = { documentId, data }
    return ApiService.fetchData<ApiResponse<{updateChecklist: Checklist}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// get checklists
export type GetChecklistsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
};

export type GetChecklistsResponse = {
    nodes: Checklist[]
    pageInfo: PageInfo
};

export async function apiGetChecklists(data: GetChecklistsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{checklists_connection: GetChecklistsResponse}>>> {
    const query = `
    query getChecklists($searchTerm: String, $pagination: PaginationArg) {
        checklists_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                items
            }
            pageInfo {
                page
                pageSize
                pageCount
                total
            }
        }
    }
  `,
  variables = { ...data }
    return ApiService.fetchData<ApiResponse<{checklists_connection: GetChecklistsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// delete checklist
export type DeleteChecklistResponse = {
    documentId: string
}

export async function apiDeleteChecklist(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteChecklist: DeleteChecklistResponse}>>> {
    const query = `
    mutation DeleteChecklist($documentId: ID!) {
        deleteChecklist(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = { documentId }
    return ApiService.fetchData<ApiResponse<{deleteChecklist: DeleteChecklistResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}
