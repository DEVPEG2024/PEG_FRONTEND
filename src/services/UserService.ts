import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Role, User, UserFrontResponse, UserResponse } from '@/@types/user'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'

export async function getUserREST(token: string) : Promise<UserFrontResponse>{
    const {data} : {data: UserResponse} = await ApiService.fetchData<UserResponse>({
        url: API_BASE_URL + '/users/me?populate[0]=role&populate[1]=customer',
        headers: {'Authorization': `Bearer ${token}`}
    })
    return mapUser(data)
}

export async function getUser(token: string) : Promise<User>{
    const {data} : {data: Omit<User, 'authority'>} = await ApiService.fetchData<User>({
        url: API_BASE_URL + '/users/me?populate[0]=role&populate[1]=customer',
        headers: {'Authorization': `Bearer ${token}`}
    })
    return {...data, authority: [data.role.name]}
}

function mapUser(userResponse: UserResponse) : UserFrontResponse {
    return {
        ...userResponse,
        _id: userResponse.id.toString()
    }
}

// get users
export type GetUsersRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetUsersResponse = {
    nodes: User[]
    pageInfo: PageInfo
};

export async function apiGetUsers(data: GetUsersRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{usersPermissionsUsers_connection: GetUsersResponse}>>> {
    const query = `
    query GetUsers($searchTerm: String, $pagination: PaginationArg) {
        usersPermissionsUsers_connection(filters: {username: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                username
                email
                blocked
                firstName
                lastName
                customer {
                    documentId
                    name
                }
                producer {
                    documentId
                    name
                }
                role {
                    documentId
                    name
                    type
                    description
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
    return ApiService.fetchData<ApiResponse<{usersPermissionsUsers_connection: GetUsersResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get user for edit by id
export async function apiGetUserForEditById(documentId: string): Promise<AxiosResponse<ApiResponse<{usersPermissionsUser: User}>>> {
    const query = `
    query GetUserForEditById($documentId: ID!) {
        usersPermissionsUser(documentId: $documentId) {
            documentId
            username
            email
            blocked
            firstName
            lastName
            customer {
                documentId
                name
            }
            producer {
                documentId
                name
            }
            role {
                documentId
                name
                type
                description
            }
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{usersPermissionsUser: User}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update user
export async function apiUpdateUser(product: Partial<User>): Promise<AxiosResponse<ApiResponse<{updateUsersPermissionsUser: User}>>> {
    const query = `
    mutation UpdateUser($documentId: ID!, $data: UserInput!) {
        updateUsersPermissionsUser(documentId: $documentId, data: $data) {
            data {
                documentId
                username
                email
                blocked
                firstName
                lastName
                customer {
                    documentId
                    name
                }
                producer {
                    documentId
                    name
                }
                role {
                    documentId
                    name
                    type
                    description
                }
            }
        }
    }
  `,
  {documentId, ...data} = product,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateUsersPermissionsUser: User}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete user
export type DeleteUserResponse = {
    documentId: string
}

export async function apiDeleteUser(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteUsersPermissionsUser: DeleteUserResponse}>>> {
    const query = `
    mutation DeleteUser($documentId: ID!) {
        deleteUsersPermissionsUser(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteUsersPermissionsUser: DeleteUserResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create user
export type CreateUserRequest = Omit<User, "documentId">

export async function apiCreateUser(data: CreateUserRequest): Promise<AxiosResponse<ApiResponse<{createUsersPermissionsUser: User}>>> {
    const query = `
    mutation CreateUser($data: UserInput!) {
        createUsersPermissionsUser(data: $data) {
            documentId
            username
            email
            blocked
            firstName
            lastName
            customer {
                documentId
                name
            }
            producer {
                documentId
                name
            }
            role {
                documentId
                name
                type
                description
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createUsersPermissionsUser: User}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get users permissions roles
export async function apiGetUsersPermissionsRoles(): Promise<AxiosResponse<ApiResponse<{usersPermissionsRoles: Role[]}>>> {
    const query = `
    query getUsersPermissionsRoles {
        usersPermissionsRoles {
            documentId
            name
        }
    }
  `

    return ApiService.fetchData<ApiResponse<{usersPermissionsRoles: Role[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query
        }
    })
}