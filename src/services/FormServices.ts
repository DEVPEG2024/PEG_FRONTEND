import ApiService from './ApiService'
import {
    PUT_FORMS_API_URL
  } from "@/constants/api.constant";
import { Form, IField, IForm } from '@/@types/form'
import { AxiosResponse } from 'axios';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// create form
export type CreateFormResponse = {
    documentId: string
}

export type CreateFormRequest = {
    name: string
    form_fields?: IField[]
}

export async function apiCreateForm(data: CreateFormRequest): Promise<AxiosResponse<ApiResponse<{createForm: CreateFormResponse}>>> {
    const query = `
    mutation CreateForm($data: FormInput!) {
        createForm(data: $data) {
            documentId
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createForm: CreateFormResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

type UpdateFormResponse = {
    form: IForm
    result: boolean
    message: string
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
        forms_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                form_fields {
                    documentId
                }
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
    data
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

// update form
export async function apiUpdateForm(form: IForm) {
    return ApiService.fetchData<UpdateFormResponse>({
        url: PUT_FORMS_API_URL + '/' + form._id,
        method: 'put',
        data: form
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
