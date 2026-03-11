import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import type {
    SignInCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpCredential,
    SignUpResponse,
} from '@/@types/auth'
import { LOGIN_API_URL } from '@/constants/api.constant'

export type RefreshToken = {
    refreshToken: string
}

export async function apiSignIn(data: SignInCredential) {
    return ApiService.fetchData<SignInResponse>({
        url: LOGIN_API_URL,
        method: 'post',
        data,
    })
}

export async function apiSignOut() {
    return ApiService.fetchData({
        url: `${API_BASE_URL}/sign-out`,
        method: 'post',
    })
}

export async function apiForgotPassword(data: ForgotPassword) {
    return ApiService.fetchData({
        url: `${API_BASE_URL}/auth/forgot-password`,
        method: 'post',
        data,
    })
}

export async function apiResetPassword(data: ResetPassword) {
    return ApiService.fetchData({
        url: `${API_BASE_URL}/auth/reset-password`,
        method: 'post',
        data,
    })
}

export async function apiSignUp(data: SignUpCredential) {
    return ApiService.fetchData<SignUpResponse>({
        url: `${API_BASE_URL}/auth/local/register`,
        method: 'post',
        data: {
            username: data.email,
            email: data.email,
            password: data.password,
        },
    })
}

export async function apiUpdateProfile(userId: number, firstName: string, lastName: string, jwt: string) {
    return ApiService.fetchData({
        url: `${API_BASE_URL}/users/${userId}`,
        method: 'put',
        data: { firstName, lastName },
        headers: { Authorization: `Bearer ${jwt}` },
    })
}

export async function apiRefreshToken(_data: RefreshToken) {
    return ApiService.fetchData({
        url: '/refresh-token',
        method: 'post',
    })
}
