import ApiService from './ApiService'
import { CHANGE_TASK_STATUS_API_URL, DELETE_COMMENT_API_URL, DELETE_FILE_API_URL, DELETE_INVOICES_PROJECT_API_URL, DELETE_PROJECTS_API_URL, DELETE_TASKS_API_URL, GET_INVOICES_PROJECT_API_URL, GET_PROJECTS_API_URL, GET_PROJECTS_CUSTOMER_API_URL, GET_PROJECTS_PRODUCER_API_URL, PAY_PRODUCER_API_URL, POST_COMMENT_API_URL, POST_INVOICES_PROJECT_API_URL, POST_PROJECTS_API_URL, POST_TASKS_API_URL, PUT_INVOICES_PROJECT_API_URL, PUT_PROJECTS_API_URL, PUT_TASKS_API_URL, UPLOAD_FILE_API_URL } from '@/constants/api.constant'
import { IComment, IFile, IProject, ITask } from '@/@types/project'
import { Invoice } from '@/@types/invoice'



type ProjectResponse = {
    projects: IProject[]
    total: number
    result: boolean
    message: string
}

type CreateProjectResponse = {
    project: IProject
    message: string
    result: boolean
}

type DeleteProjectResponse = {
    message: string
    result: boolean
}

export async function apiGetProjects(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<ProjectResponse>({
        url: GET_PROJECTS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

export async function apiCreateProject(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateProjectResponse>({
        url: POST_PROJECTS_API_URL,
        method: 'post',
        data: data
    })
}

export async function apiUpdateProject(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateProjectResponse>({
        url: `${PUT_PROJECTS_API_URL}/${data._id}`,
        method: 'put',
        data: data
    })
}

export async function apiDeleteProject(id: string) {
    return ApiService.fetchData<DeleteProjectResponse>({
        url: DELETE_PROJECTS_API_URL + `/${id}`,
        method: 'delete',
    })
}

type CreateCommentResponse = {
    comment: IComment
    file: IFile
    message: string
    result: boolean
}
export async function apiCreateComment(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateCommentResponse>({
        url: POST_COMMENT_API_URL,
        method: 'post',
        data: data
    })
}

export async function apiDeleteComment(data: Record<string, unknown>) {
    return ApiService.fetchData<DeleteProjectResponse>({
        url: DELETE_COMMENT_API_URL + `/${data._id}`,
        method: 'put',
        data: data
    })
}

type UploadFileResponse = {
    file: IFile
    message: string
    result: boolean
}

export async function apiUploadFileToProject(data: Record<string, unknown>) {
    return ApiService.fetchData<UploadFileResponse>({
        url: UPLOAD_FILE_API_URL,
        method: 'post',
        data: data
    })
}

export async function apiDeleteFileFromProject(data: Record<string, unknown>) {
    return ApiService.fetchData<DeleteProjectResponse>({
        url: DELETE_FILE_API_URL,
        method: 'delete',
        data: data
    })
}

export type CreateTaskResponse = {
    projectId: string
    task: ITask
    message: string
    result: boolean
}

type CreateTaskRequest = {
    task: ITask
    projectId: string
}

type UpdateTaskRequest = {
    task: ITask
    projectId: string
}

export async function apiCreateTask(data: CreateTaskRequest) {
    return ApiService.fetchData<CreateTaskResponse>({
        url: POST_TASKS_API_URL,
        method: 'post',
        data: data
    })
}

export async function apiUpdateTask(data: UpdateTaskRequest) {
    return ApiService.fetchData<CreateTaskResponse>({
        url: PUT_TASKS_API_URL + `/${data.task._id}`,
        method: 'put',
        data: data
    })
}

export async function apiDeleteTask(data: Record<string, unknown>) {
    return ApiService.fetchData<DeleteProjectResponse>({
        url: DELETE_TASKS_API_URL+ `/${data._id}`,
        method: 'delete',
        data: data
    })
}

type ChangeTaskStatusRequest = {
    projectId: string
    taskId: string
    status: string
}

type ChangeTaskStatusResponse = {
    message: string
    result: boolean
    task: ITask
    projectId: string
}

export async function apiChangeTaskStatus(data: ChangeTaskStatusRequest) {
    return ApiService.fetchData<ChangeTaskStatusResponse>({
        url: CHANGE_TASK_STATUS_API_URL + `/${data.taskId}`,
        method: 'put',
        data: data
    })
}


// Factures

type GetInvoicesProjectResponse = {
    invoices: Invoice[]
    message: string
    result: boolean
}

export async function apiGetInvoicesProject(data: Record<string, unknown>) {
    return ApiService.fetchData<GetInvoicesProjectResponse>({
        url: GET_INVOICES_PROJECT_API_URL + `/${data.projectId}`,
        method: 'get',
        data: data
    })
}

type CreateInvoiceRequest = {
    invoice: Invoice
    projectId: string
   
}

export async function apiCreateInvoice(data: CreateInvoiceRequest) {
    return ApiService.fetchData<CreateInvoiceRequest>({
        url: POST_INVOICES_PROJECT_API_URL,
        method: 'post',
        data: data
    })
}

type DeleteInvoiceRequest = {
    invoiceId: string
}

export async function apiDeleteInvoice(data: DeleteInvoiceRequest) {
    return ApiService.fetchData<DeleteInvoiceRequest>({
        url: DELETE_INVOICES_PROJECT_API_URL + `/${data.invoiceId}`,
        method: 'delete',
        data: data
    })
}

type UpdateInvoiceRequest = {
    invoice: Invoice
    invoiceId: string
}

export async function apiUpdateInvoice(data: UpdateInvoiceRequest) {
    return ApiService.fetchData<UpdateInvoiceRequest>({
        url: PUT_INVOICES_PROJECT_API_URL + `/${data.invoiceId}`,
        method: 'put',
        data: data
    })  
}


type PayProducerRequest = {
    projectId: string
    producerId: string
    amount: number
    ref: string
}

export async function apiPayProducer(data: PayProducerRequest) {
    return ApiService.fetchData<PayProducerRequest>({
        url: PAY_PRODUCER_API_URL,
        method: 'post',
        data: data
    })
}


// Customer

export async function apiGetProjectsCustomer(page: number, pageSize: number, searchTerm: string = "", customerId: string) {
    return ApiService.fetchData<ProjectResponse>({
        url: GET_PROJECTS_CUSTOMER_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm, customerId }
    })
}

// Producer

export async function apiGetProjectsProducer(page: number, pageSize: number, searchTerm: string = "", producerId: string) {
    return ApiService.fetchData<ProjectResponse>({
        url: GET_PROJECTS_PRODUCER_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm, producerId }
    })
}
