import ApiService from './ApiService'
import { DELETE_COMMENT_API_URL, DELETE_FILE_API_URL, DELETE_INVOICES_PROJECT_API_URL, GET_INVOICES_PROJECT_API_URL, GET_PROJECTS_API_URL, GET_PROJECTS_CUSTOMER_API_URL, GET_PROJECTS_PRODUCER_API_URL, PAY_PRODUCER_API_URL, POST_COMMENT_API_URL, POST_INVOICES_PROJECT_API_URL, POST_PROJECTS_API_URL, POST_TASKS_API_URL, PUT_INVOICES_PROJECT_API_URL, PUT_PROJECTS_API_URL, PUT_TASKS_API_URL, UPLOAD_FILE_API_URL } from '@/constants/api.constant'
import { IComment, IFile, IProject, ITask, Project } from '@/@types/project'
import { InvoiceOld } from '@/@types/invoice'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { API_GRAPHQL_URL } from '@/configs/api.config'


// TODO: Services

// update project
export async function apiUpdateProject(project: Partial<Project>): Promise<AxiosResponse<ApiResponse<{updateProject: Project}>>> {
    const query = `
    mutation UpdateProject($documentId: ID!, $data: ProjectInput!) {
        updateProject(documentId: $documentId, data: $data) {
            documentId
            comments {
                content
                createdAt
                user {
                    firstName
                    lastName
                    customer {
                        name
                    }
                }
            }
            customer {
                documentId
                name
            }
            description
            endDate
            name
            orderItem {
                documentId
                price
                product {
                    name
                }
                sizeSelections
                state
            }
            paidPrice
            paymentState
            price
            priority
            producerPrice
            producer {
                documentId
                name
            }
            progress
            remainingPrice
            startDate
            state
            tasks {
                name
                priority
                startDate
                state
            }
        }
    }
  `,
  {documentId, ...data} = project,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateProject: Project}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// Create project
export type CreateProjectRequest = Omit<Project, 'documentId'>

export async function apiCreateProject(data: CreateProjectRequest): Promise<AxiosResponse<ApiResponse<{createProject: Project}>>> {
    const query = `
    mutation CreateProject($data: ProjectInput!) {
        createProject(data: $data) {
            documentId
            comments {
                content
            }
            customer {
                documentId
                name
            }
            endDate
            name
            paymentState
            price
            progress
            startDate
            state
            tasks {
                documentId
                state
            }
        }
    }
  `,
  variables = {
    data: {
        ...data,
        customer: data.customer?.documentId,
        orderItem: data.orderItem?.documentId,
        invoice: data.invoice?.documentId
    }
  }
    return ApiService.fetchData<ApiResponse<{createProject: Project}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get project by id
export async function apiGetProjectById(documentId: string): Promise<AxiosResponse<ApiResponse<{project: Project}>>> {
    const query = `
    query GetProject($documentId: ID!) {
        project(documentId: $documentId) {
            documentId
            comments {
                content
                createdAt
                user {
                    firstName
                    lastName
                    customer {
                        name
                    }
                }
            }
            customer {
                documentId
                name
            }
            description
            endDate
            invoices {
                documentId
                createdAt
                name
                date
                paymentState
                totalAmount
            }
            name
            orderItem {
                documentId
                price
                product {
                    name
                }
                sizeSelections
                state
            }
            paidPrice
            paymentState
            price
            priority
            producerPrice
            progress
            remainingPrice
            startDate
            state
            tasks {
                documentId
                name
                description
                priority
                startDate
                state
            }
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{project: Project}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get projects
export type GetProjectsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProjectsResponse = {
    nodes: Project[]
    pageInfo: PageInfo
};

export async function apiGetProjects(data: GetProjectsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getProjects($searchTerm: String, $pagination: PaginationArg) {
        projects_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                comments {
                    content
                }
                customer {
                    documentId
                    name
                }
                endDate
                name
                paymentState
                price
                progress
                startDate
                state
                tasks {
                    documentId
                    state
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{projects_connection: GetProjectsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get customer projects
export type GetCustomerProjectsRequest = {
    customerDocumentId: string;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export async function apiGetCustomerProjects(data: GetCustomerProjectsRequest = {customerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getCustomerProjects($customerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        projects_connection (filters: {
            and: [
            {
                customer: {
                documentId: {eq: $customerDocumentId}
                }
            },
            {
                name: {contains: $searchTerm}
            }
            ]
            }, pagination: $pagination){
            nodes {
                documentId
                comments {
                    content
                }
                customer {
                    name
                }
                endDate
                name
                paymentState
                price
                progress
                startDate
                state
                tasks {
                    documentId
                    state
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{projects_connection: GetProjectsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete project
export type DeleteProjectResponse = {
    documentId: string
}

export async function apiDeleteProject(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteProject: DeleteProjectResponse}>>> {
    const query = `
    mutation DeleteProject($documentId: ID!) {
        deleteProject(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteProject: DeleteProjectResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}


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

type DeleteProjectResponseOld = {
    message: string
    result: boolean
}

export async function apiGetProjectsOld(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<ProjectResponse>({
        url: GET_PROJECTS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

export async function apiUpdateProjectOld(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateProjectResponse>({
        url: `${PUT_PROJECTS_API_URL}/${data._id}`,
        method: 'put',
        data: data
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
    return ApiService.fetchData<DeleteProjectResponseOld>({
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
    return ApiService.fetchData<DeleteProjectResponseOld>({
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

// Factures

type GetInvoicesProjectResponse = {
    invoices: InvoiceOld[]
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
    invoice: InvoiceOld
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
