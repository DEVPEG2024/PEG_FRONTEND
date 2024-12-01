import ApiService from './ApiService'
import { API_GRAPHQL_URL } from '@/configs/api.config'
import { AxiosResponse } from 'axios'
import { ApiResponse } from '@/utils/serviceHelper'
import { FormAnswer } from '@/@types/formAnswer'

// Create form answer
export type CreateFormAnswerRequest = Omit<FormAnswer, 'documentId'>

export async function apiCreateFormAnswer(data: CreateFormAnswerRequest): Promise<AxiosResponse<ApiResponse<{createFormAnswer: FormAnswer}>>> {
    const query = `
    mutation CreateFormAnswer($data: FormAnswerInput!) {
        createFormAnswer(data: $data) {
            documentId
        }
    }
  `,
  variables = {
    data: {
        form: data.form.documentId,
        answer: data.answer
    }
  }
    return ApiService.fetchData<ApiResponse<{createFormAnswer: FormAnswer}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}