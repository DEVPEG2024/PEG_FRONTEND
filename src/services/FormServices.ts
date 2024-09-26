import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IForm, IFormList } from '@/@types/forms'

type CreateFormResponse = {
    form: IForm
    result: boolean
    message: string
}

type CreateFormRequest = {
    title: string
    fields: IForm[]
}

type GetAllFormsResponse = {
    forms: IFormList[]
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
        url: `${API_BASE_URL}/forms/create`,
        method: 'post',
        data: form
    })
}


// get all forms
export async function apiGetForms(page: number, pageSize: number, searchTerm: string) {
    return ApiService.fetchData<GetAllFormsResponse>({
        url: `${API_BASE_URL}/forms`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// update form
export async function apiUpdateForm(form: IFormList) {
    return ApiService.fetchData<UpdateFormResponse>({
        url: `${API_BASE_URL}/forms/${form._id}`,
        method: 'put',
        data: form
    })
}

// delete form
export async function apiDeleteForm(id: string) {
    return ApiService.fetchData<DeleteFormResponse>({
        url: `${API_BASE_URL}/forms/${id}`,
        method: 'delete'
    })
}
