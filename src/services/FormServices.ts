import ApiService from './ApiService'
import {
    DELETE_FORMS_API_URL,
    GET_FORMS_API_URL,
    POST_FORMS_API_URL,
    PUT_FORMS_API_URL
  } from "@/constants/api.constant";
import { IField, IForm } from '@/@types/form'

type CreateFormResponse = {
    form: IForm
    result: boolean
    message: string
}

type CreateFormRequest = {
    title: string
    fields: IField[]
}

type GetAllFormsResponse = {
    forms: IForm[]
    result: boolean
    message: string
    total: number
}

type UpdateFormResponse = {
    form: IForm
    result: boolean
    message: string
}

type DeleteFormResponse = {
    result: boolean
    message: string
}

// create form
export async function apiCreateForm(form: CreateFormRequest) {
    return ApiService.fetchData<CreateFormResponse>({
        url: POST_FORMS_API_URL,
        method: 'post',
        data: form
    })
}


// get all forms
export async function apiGetForms(page: number, pageSize: number, searchTerm: string) {
    return ApiService.fetchData<GetAllFormsResponse>({
        url: GET_FORMS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
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
export async function apiDeleteForm(id: string) {
    return ApiService.fetchData<DeleteFormResponse>({
        url: DELETE_FORMS_API_URL + '/' + id,
        method: 'delete'
    })
}
