import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IFormAnswer } from '@/@types/formAnswer'

type GetFormAnswerByIdResponse = {
    formAnswer: IFormAnswer
    message: string
    result: string
}

export async function apiGetFormAnswerById(id: string) {
    return ApiService.fetchData<GetFormAnswerByIdResponse>({
        url: `${API_BASE_URL}/formAnswers` + '/' + id,
        method: 'get'
    })
}

type CreateFormAnswerResponse = {
    formAnswer: IFormAnswer
    message: string
    result: string
}

export async function apiCreateFormAnswer(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateFormAnswerResponse>({
        url: `${API_BASE_URL}/formAnswers/create`,
        method: 'post',
        data
    })
}