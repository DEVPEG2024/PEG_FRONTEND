import ApiService from './ApiService'
import { Project } from '@/@types/project'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { API_GRAPHQL_URL } from '@/configs/api.config'

// update project
export async function apiUpdateProject(project: Partial<Project>): Promise<AxiosResponse<ApiResponse<{updateProject: Project}>>> {
    const query = `
    mutation UpdateProject($documentId: ID!, $data: ProjectInput!) {
        updateProject(documentId: $documentId, data: $data) {
            documentId
            comments (pagination: {limit: 100}) {
                documentId
                content
                createdAt
                user {
                    documentId
                    avatar {
                        documentId
                        url
                    }
                    firstName
                    lastName
                    customer {
                        name
                    }
                    producer {
                        name
                    }
                    role {
                        name
                    }
                }
                images {
                    documentId
                    url
                    name
                }
                visibility
            }
            customer {
                documentId
                name
                logo { url documentId }
                users (pagination: {limit: 1}) { avatar { url } }
            }
            description
            endDate
            images (pagination: {limit: 100}){
                documentId
                url
                name
            }
            devis (pagination: {limit: 100}){
                documentId
                url
                name
            }

            invoices (pagination: {limit: 100}){
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
                orderItems (pagination: {limit: 100}){
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeAndColorSelections
                }
                file {
                    documentId
                    url
                    name
                }
            }
            name
            orderItem {
                documentId
                price
                product {
                    name
                }
                sizeAndColorSelections
                state
            }
            paidPrice
            poolable
            price
            priority
            producerPrice
            producer {
                documentId
                name
                users (pagination: {limit: 1}) { avatar { url } }
            }
            startDate
            state
            adminNotes
            additionalSales
            tasks (pagination: {limit: 100}){
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
  cleanData: Record<string, any> = { ...data }

  // Map relations to documentId arrays for Strapi GraphQL
  if (cleanData.invoices) cleanData.invoices = cleanData.invoices.map((invoice: any) => invoice.documentId);
  if (cleanData.comments) cleanData.comments = cleanData.comments.map((comment: any) => comment.documentId);
  if (cleanData.tasks) cleanData.tasks = cleanData.tasks.map((task: any) => task.documentId);
  if (cleanData.devis) cleanData.devis = cleanData.devis.map((d: any) => d.id);

  // Remove fields that are not part of ProjectInput
  delete cleanData.orderItem;
  delete cleanData.checklistItems;
  delete cleanData.customerImages;
  delete cleanData.savTickets;
  delete cleanData.additionalSales;

  const variables = {
    documentId,
    data: cleanData,
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
            customer {
                documentId
                name
                logo { url documentId }
                users (pagination: {limit: 1}) { avatar { url } }
            }
            description
            endDate
            images (pagination: {limit: 100}){
                documentId
                url
                name
            }
            devis (pagination: {limit: 100}){
                documentId
                url
                name
            }

            invoices (pagination: {limit: 100}){
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
                orderItems (pagination: {limit: 100}){
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeAndColorSelections
                }
                file {
                    documentId
                    url
                    name
                }
            }
            name
            orderItem {
                documentId
                price
                product {
                    name
                }
                sizeAndColorSelections
                state
            }
            paidPrice
            poolable
            price
            priority
            producerPrice
            producer {
                documentId
                name
                users (pagination: {limit: 1}) { avatar { url } }
            }
            startDate
            state
            tasks (pagination: {limit: 100}){
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
    query GetProjectById($documentId: ID!) {
        project(documentId: $documentId) {
            documentId
            comments (pagination: {limit: 100}){
                documentId
                content
                createdAt
                user {
                    documentId
                    avatar {
                        documentId
                        url
                    }
                    firstName
                    lastName
                    customer {
                        name
                    }
                    producer {
                        name
                    }
                    role {
                        name
                    }
                }
                images {
                    documentId
                    url
                    name
                }
                visibility
            }
            customer {
                documentId
                name
                logo { url documentId }
                users (pagination: {limit: 1}) { avatar { url } }
            }
            description
            endDate
            images (pagination: {limit: 100}){
                documentId
                url
                name
            }
            devis (pagination: {limit: 100}){
                documentId
                url
                name
            }

            invoices (pagination: {limit: 100}){
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
                orderItems (pagination: {limit: 100}){
                    documentId
                    price
                    product {
                        documentId
                        name
                    }
                    sizeAndColorSelections
                }
                file {
                    documentId
                    url
                    name
                }
            }
            name
            orderItem {
                documentId
                price
                batStatus
                batComment
                product {
                    documentId
                    name
                    images {
                        url
                    }
                    requiresBat
                    batFile {
                        documentId
                        url
                        name
                    }
                }
                sizeAndColorSelections
                state
            }
            paidPrice
            poolable
            price
            priority
            producerPrice
            producerPaidPrice
            producer {
                documentId
                name
                users (pagination: {limit: 1}) { avatar { url } }
            }
            startDate
            state
            adminNotes
            additionalSales
            tasks (pagination: {limit: 100}){
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
    statusFilter?: string;
  };

export type GetProjectsResponse = {
    nodes: Project[]
    pageInfo: PageInfo
};

export async function apiGetProjects(data: GetProjectsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getProjects($searchTerm: String, $pagination: PaginationArg, $statusFilter: String) {
        projects_connection(filters: {
            and: [
                {name: {containsi: $searchTerm}},
                {state: {containsi: $statusFilter}}
            ]
        }, pagination: $pagination) {
            nodes {
                documentId
                customer {
                    documentId
                    name
                    logo { url documentId }
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                endDate
                name
                images {
                    url
                }
                orderItem {
                    product {
                        images {
                            url
                        }
                    }
                }
                paidPrice
                poolable
                price
                priority
                producer {
                    documentId
                    name
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                producerPrice
                producerPaidPrice
                startDate
                state
                additionalSales
                tasks (pagination: {limit: 100}){
                    documentId
                    state
                }
                checklistItems
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
    searchTerm: data.searchTerm,
    pagination: data.pagination,
    statusFilter: data.statusFilter || undefined,
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
    statusFilter?: string;
  };

export async function apiGetCustomerProjects(data: GetCustomerProjectsRequest = {customerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getCustomerProjects($customerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg, $statusFilter: String) {
        projects_connection (filters: {
            and: [
            {
                customer: {
                    documentId: {eq: $customerDocumentId}
                }
            },
            {
                name: {containsi: $searchTerm}
            },
            {
                state: {containsi: $statusFilter}
            }
            ]
            }, pagination: $pagination){
            nodes {
                documentId
                customer {
                    documentId
                    name
                    logo { url documentId }
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                endDate
                name
                images {
                    url
                }
                orderItem {
                    documentId
                    batStatus
                    product {
                        documentId
                        requiresBat
                        batFile {
                            url
                        }
                        images {
                            url
                        }
                    }
                }
                paidPrice
                price
                priority
                producer {
                    documentId
                    name
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                startDate
                state
                additionalSales
                tasks (pagination: {limit: 100}){
                    documentId
                    state
                }
                checklistItems
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
    customerDocumentId: data.customerDocumentId,
    searchTerm: data.searchTerm,
    pagination: data.pagination,
    statusFilter: data.statusFilter || undefined,
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
    statusFilter?: string;
  };

export async function apiGetProducerProjects(data: GetProducerProjectsRequest = {producerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetProjectsResponse}>>> {
    const query = `
    query getProducerProjects($producerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg, $statusFilter: String) {
        projects_connection (filters: {
            and: [
            {
                producer: {
                    documentId: {eq: $producerDocumentId}
                }
            },
            {
                name: {containsi: $searchTerm}
            },
            {
                state: {containsi: $statusFilter}
            }
            ]
            }, pagination: $pagination){
            nodes {
                documentId
                customer {
                    documentId
                    name
                    logo { url documentId }
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                producer {
                    documentId
                    name
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                endDate
                name
                images {
                    url
                }
                orderItem {
                    product {
                        images {
                            url
                        }
                    }
                }
                paidPrice
                price
                priority
                producerPrice
                startDate
                state
                additionalSales
                tasks (pagination: {limit: 100}){
                    documentId
                    state
                }
                checklistItems
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
    producerDocumentId: data.producerDocumentId,
    searchTerm: data.searchTerm,
    pagination: data.pagination,
    statusFilter: data.statusFilter || undefined,
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

// get pool projects
export type GetPoolProjectsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetPoolProjectsResponse = {
    nodes: Project[]
    pageInfo: PageInfo
};

export async function apiGetPoolProjects(data: GetPoolProjectsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{projects_connection: GetPoolProjectsResponse}>>> {
    const query = `
    query getPoolProjects($searchTerm: String, $pagination: PaginationArg) {
        projects_connection(filters: {
          and: [
            {
              name: {containsi: $searchTerm}
            },
            {
              poolable: {eq: true}
            },
            {
              producer: {documentId: {null: true}}
            }
          ]
        }, pagination: $pagination) {
            nodes {
                documentId
                customer {
                    documentId
                    name
                    logo { url documentId }
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                endDate
                name
                images {
                    url
                }
                orderItem {
                    product {
                        images {
                            url
                        }
                    }
                }
                poolable
                price
                producer {
                    documentId
                    name
                    users (pagination: {limit: 1}) { avatar { url } }
                }
                producerPrice
                startDate
                state
                tasks (pagination: {limit: 100}){
                    documentId
                    state
                }
                checklistItems
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
    return ApiService.fetchData<ApiResponse<{projects_connection: GetPoolProjectsResponse}>>({
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

// get projects linked to order item
export async function apiGetProjectsLinkedToOrderItem(orderItemDocumentId: string): Promise<AxiosResponse<ApiResponse<{projects: Project[]}>>> {
    const query = `
    query GetProjectsLinkedToOrderItem($orderItemDocumentId: ID!) {
        projects(filters: {orderItem: {documentId: {eq: $orderItemDocumentId}}}) {
            documentId
        }
    }
  `,
  variables = {
    orderItemDocumentId
  }
    return ApiService.fetchData<ApiResponse<{projects: Project[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get project checklistItems only (separate query to avoid breaking main project load)
export async function apiGetProjectChecklistItems(documentId: string): Promise<AxiosResponse<ApiResponse<{project: { documentId: string; checklistItems: import('@/@types/checklist').ChecklistItem[] }}>>> {
    const query = `
    query GetProjectChecklistItems($documentId: ID!) {
        project(documentId: $documentId) {
            documentId
            checklistItems
        }
    }
  `,
  variables = { documentId }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// get product checklist template (separate query to avoid breaking project load for customers)
export async function apiGetProductChecklist(productDocumentId: string): Promise<AxiosResponse<ApiResponse<{product: { documentId: string; checklist: import('@/@types/checklist').Checklist | null }}>>> {
    const query = `
    query GetProductChecklist($documentId: ID!) {
        product(documentId: $documentId) {
            documentId
            checklist {
                documentId
                name
                items
            }
        }
    }
  `,
  variables = { documentId: productDocumentId }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// get project savTickets only (separate query)
export async function apiGetProjectSavTickets(documentId: string): Promise<AxiosResponse<ApiResponse<{project: { documentId: string; savTickets: import('@/@types/sav').SavTicket[] }}>>> {
    const query = `
    query GetProjectSavTickets($documentId: ID!) {
        project(documentId: $documentId) {
            documentId
            savTickets
        }
    }
  `,
  variables = { documentId }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// update project savTickets only (separate mutation)
export async function apiUpdateProjectSavTickets(documentId: string, savTickets: import('@/@types/sav').SavTicket[]): Promise<AxiosResponse<ApiResponse<{updateProject: { documentId: string; savTickets: import('@/@types/sav').SavTicket[] }}>>> {
    const query = `
    mutation UpdateProjectSavTickets($documentId: ID!, $data: ProjectInput!) {
        updateProject(documentId: $documentId, data: $data) {
            documentId
            savTickets
        }
    }
  `,
  variables = { documentId, data: { savTickets } }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// update project checklistItems only (separate mutation)
export async function apiUpdateProjectChecklistItems(documentId: string, checklistItems: import('@/@types/checklist').ChecklistItem[]): Promise<AxiosResponse<ApiResponse<{updateProject: { documentId: string; checklistItems: import('@/@types/checklist').ChecklistItem[] }}>>> {
    const query = `
    mutation UpdateProjectChecklistItems($documentId: ID!, $data: ProjectInput!) {
        updateProject(documentId: $documentId, data: $data) {
            documentId
            checklistItems
        }
    }
  `,
  variables = { documentId, data: { checklistItems } }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// get project additionalSales only (separate query)
export async function apiGetProjectAdditionalSales(documentId: string): Promise<AxiosResponse<ApiResponse<{project: { documentId: string; additionalSales: import('@/@types/project').AdditionalSale[] }}>>> {
    const query = `
    query GetProjectAdditionalSales($documentId: ID!) {
        project(documentId: $documentId) {
            documentId
            additionalSales
        }
    }
  `,
  variables = { documentId }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}

// update project additionalSales only (separate mutation)
export async function apiUpdateProjectAdditionalSales(documentId: string, additionalSales: import('@/@types/project').AdditionalSale[]): Promise<AxiosResponse<ApiResponse<{updateProject: { documentId: string; additionalSales: import('@/@types/project').AdditionalSale[] }}>>> {
    const query = `
    mutation UpdateProjectAdditionalSales($documentId: ID!, $data: ProjectInput!) {
        updateProject(documentId: $documentId, data: $data) {
            documentId
            additionalSales
        }
    }
  `,
  variables = { documentId, data: { additionalSales } }
    return ApiService.fetchData({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables }
    })
}