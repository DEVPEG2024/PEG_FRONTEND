import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Role, User } from '@/@types/user'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'
import { Customer } from '@/@types/customer'
import { Producer } from '@/@types/producer'

// TODO: Voir si à un moment on peut se passer des ids pour n'utiliser que les documentIds --> voir évolutions du plugin Users & permissions
// VOir https://github.com/strapi/strapi/pull/22321 --> ajout de documentId dans le retour de l'appel à /me

export async function getUser(token: string) : Promise<UserWithId>{
    const {data} : {data: Omit<User, 'authority'>} = await ApiService.fetchData<User>({
        url: API_BASE_URL + '/users/me?populate[0]=role&populate[1]=customer&populate[2]=producer&populate[3]=avatar',
        headers: {'Authorization': `Bearer ${token}`}
    })
    return {...data, authority: [data.role.name]}
}

export type UserWithId = User & {
    id: string;
}

export async function apiGetAllUsers() : Promise<UserWithId[]> {    
    const response = await ApiService.fetchData<UserWithId[]>({
        url: API_BASE_URL + "/users/",
        method: 'get'
    })
    
    return response.data
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
        usersPermissionsUsers_connection(filters: {username: {containsi: $searchTerm}}, pagination: $pagination) {
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
                avatar {
                    url
                    documentId
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

// update user via custom admin endpoint
export async function apiUpdateUser(user: Partial<User>, id: string): Promise<AxiosResponse<User>> {
    const { documentId: _, ...data } = user as any
    return ApiService.fetchData<User>({
        url: API_BASE_URL + `/auth/admin-update-user/${id}`,
        method: 'put',
        data,
    })
}

// update own profile (no admin role required)
export async function apiUpdateOwnProfile(user: Partial<User>): Promise<AxiosResponse<User>> {
    const { documentId: _, ...data } = user as any
    return ApiService.fetchData<User>({
        url: API_BASE_URL + `/auth/update-own-profile`,
        method: 'put',
        data,
    })
}

// update user password (Strapi v5 REST)
export async function apiUpdateUserPassword(password: string, documentId: string): Promise<AxiosResponse<User>> {
    return ApiService.fetchData<User>({
        url: `/users/${documentId}`,
        method: 'put',
        data: { password },
    })
}

// delete user
export type DeleteUserResponse = {
    documentId: string
}

export async function apiDeleteUser(documentId: string): Promise<AxiosResponse<DeleteUserResponse>> {
    return ApiService.fetchData<DeleteUserResponse>({
        url: `/users/${documentId}`,
        method: 'delete',
    })
}

// create user via custom admin endpoint (creates + assigns role/customer/producer in one call)
export type CreateUserRequest = Omit<User, "documentId">

export async function apiCreateUser(data: CreateUserRequest): Promise<AxiosResponse<{ id: number; documentId: string; email: string }>> {
    return ApiService.fetchData<{ id: number; documentId: string; email: string }>({
        url: API_BASE_URL + '/auth/admin-create-user',
        method: 'post',
        data: {
            username: data.username || data.email,
            email: data.email,
            password: 'Peg2025',
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            customer: data.customer || undefined,
            producer: data.producer || undefined,
            blocked: data.blocked || false,
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

export type RoleWithId = Role & {
    id: number;
}

export async function apiGetAllRoles() : Promise<{roles: RoleWithId[]}> {    
    const response = await ApiService.fetchData<{roles: RoleWithId[]}>({
        url: API_BASE_URL + "/users-permissions/roles/",
        method: 'get'
    })
    
    return response.data
}

// Ne devrait pas être ici mais spécifique au plugin User donc ici en attendant une évol du plugin
export type CustomerWithId = Customer & {
    id: number;
}

export async function apiGetAllCustomers() : Promise<{data: CustomerWithId[]}> {    
    const response = await ApiService.fetchData<{data: CustomerWithId[]}>({
        url: API_BASE_URL + "/customers/",
        method: 'get'
    })
    
    return response.data
}

export type ProducerWithId = Producer & {
    id: number;
}

export async function apiGetAllProducers() : Promise<{data: ProducerWithId[]}> {    
    const response = await ApiService.fetchData<{data: ProducerWithId[]}>({
        url: API_BASE_URL + "/producers/",
        method: 'get'
    })
    
    return response.data
}