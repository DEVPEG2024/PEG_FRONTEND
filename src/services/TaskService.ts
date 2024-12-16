import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { Task } from '@/@types/project';

// create task
export type CreateTaskRequest = Omit<Task, "documentId">

export async function apiCreateTask(data: CreateTaskRequest): Promise<AxiosResponse<ApiResponse<{createTask: Task}>>> {
    const query = `
    mutation CreateTask($data: TaskInput!) {
        createTask(data: $data) {
            documentId
            name
            description
            state
            startDate
            endDate
            priority
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createTask: Task}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete task
export type DeleteTaskResponse = {
    documentId: string
}

export async function apiDeleteTask(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteTask: DeleteTaskResponse}>>> {
    const query = `
    mutation DeleteTask($documentId: ID!) {
        deleteTask(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteTask: DeleteTaskResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update task
export async function apiUpdateTask(task: Partial<Task>): Promise<AxiosResponse<ApiResponse<{updateTask: Task}>>> {
    const query = `
    mutation UpdateTask($documentId: ID!, $data: TaskInput!) {
        updateTask(documentId: $documentId, data: $data) {
            documentId
            name
            description
            state
            startDate
            endDate
            priority
        }
    }
  `,
  {documentId, ...data} = task,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateTask: Task}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}