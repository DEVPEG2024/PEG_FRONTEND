import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
} from '@/@types/auth'
import { LOGIN_API_URL, REGISTER_API_URL } from '@/constants/api.constant'

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

export async function apiSignUp(data: SignUpCredential) {
    return ApiService.fetchData<SignUpResponse>({
        url: REGISTER_API_URL,
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
        url: `${API_BASE_URL}/forgot-password`,
        method: 'post',
        data,
    })
}

export async function apiResetPassword(data: ResetPassword) {
    return ApiService.fetchData({
        url: '/reset-password',
        method: 'post',
        data,
    })
}

export async function apiRefreshToken(data: RefreshToken) {
    return ApiService.fetchData({
        url: '/refresh-token',
        method: 'post',
    })
}
