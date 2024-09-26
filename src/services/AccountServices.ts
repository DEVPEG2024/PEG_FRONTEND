import { API_BASE_URL } from '@/configs/api.config';
import ApiService from './ApiService'
import { IUser } from '@/@types/user';



type UserUpdateResponse = {
    result: boolean
    message: string
    user: IUser
}

type UserPasswordUpdateResponse = {
    result: boolean
    message: string
}

// update user
export async function apiUpdateUser(data: Record<string, unknown>) {
    return ApiService.fetchData<UserUpdateResponse>({
        url: API_BASE_URL +'/auth/user/update/' + data._id,
        method: 'put',
        data 
    })
}

// update password
export async function apiUpdatePassword(data: Record<string, unknown>) {
    return ApiService.fetchData<UserPasswordUpdateResponse>({
        url: API_BASE_URL +'/auth/user/password/' + data._id,
        method: 'put',
        data 
    })
}


