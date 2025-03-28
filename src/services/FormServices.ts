import ApiService from './ApiService'
import { Form } from '@/@types/form'
import { AxiosResponse } from 'axios';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// create form
export type CreateFormRequest = Omit<Form, "documentId">

export async function apiCreateForm(data: CreateFormRequest): Promise<AxiosResponse<ApiResponse<{createForm: Form}>>> {
    const query = `
    mutation CreateForm($data: FormInput!) {
        createForm(data: $data) {
            documentId,
            name,
            fields
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createForm: Form}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update form
export async function apiUpdateForm(form: Partial<Form>): Promise<AxiosResponse<ApiResponse<{updateForm: Form}>>> {
    const query = `
    mutation UpdateForm($documentId: ID!, $data: FormInput!) {
        updateForm(documentId: $documentId, data: $data) {
            documentId
            name,
            fields
        }
    }
  `,
  {documentId, ...data} = form,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateForm: Form}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get forms
export type GetFormsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetFormsResponse = {
    nodes: Form[]
    pageInfo: PageInfo
};

export async function apiGetForms(data: GetFormsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{forms_connection: GetFormsResponse}>>> {
    const query = `
    query getForms($searchTerm: String, $pagination: PaginationArg) {
        forms_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                fields
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
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{forms_connection: GetFormsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete form
export type DeleteFormResponse = {
    documentId: string
}

export async function apiDeleteForm(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteForm: DeleteFormResponse}>>> {
    const query = `
    mutation DeleteForm($documentId: ID!) {
        deleteForm(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteForm: DeleteFormResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}
