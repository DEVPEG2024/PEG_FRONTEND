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
export async function apiUpdateUser(user: Partial<User>, id: number): Promise<AxiosResponse<ApiResponse<{updateUsersPermissionsUser: {data: User}}>>> {
    const query = `
    mutation UpdateUser($updateUsersPermissionsUserId: ID!, $data: UsersPermissionsUserInput!) {
        updateUsersPermissionsUser(id: $updateUsersPermissionsUserId, data: $data) {
            data {
                documentId
                username
                email
                blocked
                firstName
                lastName
                avatar {
                    documentId
                }
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
  {documentId, ...data} = user,
  variables = {
    updateUsersPermissionsUserId: id,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateUsersPermissionsUser: {data: User}}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update user password
export async function apiUpdateUserPassword(password: string, id: number): Promise<AxiosResponse<ApiResponse<{updateUsersPermissionsUser: {data: User}}>>> {
    const query = `
    mutation UpdateUser($updateUsersPermissionsUserId: ID!, $data: UsersPermissionsUserInput!) {
        updateUsersPermissionsUser(id: $updateUsersPermissionsUserId, data: $data) {
            data {
                documentId
            }
        }
    }
  `,
  variables = {
    updateUsersPermissionsUserId: id,
    data: {password}
  }
    return ApiService.fetchData<ApiResponse<{updateUsersPermissionsUser: {data: User}}>>({
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

export async function apiDeleteUser(id: number): Promise<AxiosResponse<ApiResponse<{deleteUsersPermissionsUser: {data: DeleteUserResponse}}>>> {
    const query = `
    mutation DeleteUser($deleteUsersPermissionsUserId: ID!) {
        deleteUsersPermissionsUser(id: $deleteUsersPermissionsUserId) {
            data {
                documentId
            }
        }
    }
  `,
  variables = {
    deleteUsersPermissionsUserId: id
  }
    return ApiService.fetchData<ApiResponse<{deleteUsersPermissionsUser: {data: DeleteUserResponse}}>>({
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

export async function apiCreateUser(data: CreateUserRequest): Promise<AxiosResponse<{user: UserWithId}>> {
    return ApiService.fetchData<{user: UserWithId}>({
        url: API_BASE_URL + "/auth/local/register",
        method: 'post',
        data: {
            username: data.username,
            email: data.email,
            password: 'Peg2025',
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