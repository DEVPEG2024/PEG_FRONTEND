import ApiService from './ApiService'
import { PAY_PRODUCER_API_URL } from '@/constants/api.constant'
import { Project } from '@/@types/project'
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
                documentId
                content
                createdAt
                user {
                    firstName
                    lastName
                    customer {
                        name
                    }
                }
                images {
                    url
                    name
                }
            }
            customer {
                documentId
                name
            }
            description
            endDate
            images {
                documentId
                url
                name
            }
            invoices {
                documentId
                createdAt
                name
                date
                state
                dueDate
                paymentState
                paymentMethod
                amount
                vatAmount
                totalAmount
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                orderItems {
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeSelections
                }
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
            producer {
                documentId
                name
            }
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
                documentId
                content
                createdAt
                user {
                    firstName
                    lastName
                    customer {
                        name
                    }
                }
                images {
                    url
                    name
                }
            }
            customer {
                documentId
                name
            }
            description
            endDate
            images {
                documentId
                url
                name
            }
            invoices {
                documentId
                createdAt
                name
                date
                state
                dueDate
                paymentState
                paymentMethod
                amount
                vatAmount
                totalAmount
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                orderItems {
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeSelections
                }
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
            producer {
                documentId
                name
            }
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
    data: {
        ...data,
        customer: data.customer?.documentId,
        orderItem: data.orderItem?.documentId,
        invoices: data.invoices?.map((invoice) => invoice.documentId),
        producer: data.producer?.documentId,
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
                documentId
                content
                createdAt
                user {
                    firstName
                    lastName
                    customer {
                        name
                    }
                }
                images {
                    url
                    name
                }
            }
            customer {
                documentId
                name
            }
            description
            endDate
            images {
                documentId
                url
                name
            }
            invoices {
                documentId
                createdAt
                name
                date
                state
                dueDate
                paymentState
                paymentMethod
                amount
                vatAmount
                totalAmount
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                orderItems {
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeSelections
                }
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
            producer {
                documentId
                name
            }
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
                producer {
                    documentId
                    name
                }
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
                producer {
                    documentId
                    name
                }
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

// get producer projects
export type GetProducerProjectsRequest = {
    producerDocumentId: string;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export async function apiGetProducerProjects(data: GetProducerProjectsRequest = {producerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getProducerProjects($producerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        projects_connection (filters: {
            and: [
            {
                producer: {
                    documentId: {eq: $producerDocumentId}
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
                    documentId
                    name
                }
                producer {
                    documentId
                    name
                }
                endDate
                name
                paymentState
                price
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
// Factures
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
