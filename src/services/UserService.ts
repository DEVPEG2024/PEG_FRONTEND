import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { User, UserFrontResponse, UserResponse } from '@/@types/user'


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
