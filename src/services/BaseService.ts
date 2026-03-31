import axios from 'axios'
import appConfig from '@/configs/app.config'
import { TOKEN_TYPE, REQUEST_HEADER_AUTH_KEY } from '@/constants/api.constant'
import { PERSIST_STORE_NAME } from '@/constants/app.constant'
import deepParseJson from '@/utils/deepParseJson'
import store, { signOutSuccess } from '../store'
import { API_BASE_URL } from '@/configs/api.config'

const unauthorizedCode = [401]

/** Decode JWT payload and check expiration (returns true if expired or invalid) */
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (!payload.exp) return false // no expiration claim
        return payload.exp * 1000 < Date.now()
    } catch {
        return true // malformed token = treat as expired
    }
}

const BaseService = axios.create({
    timeout: 60000,
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

BaseService.interceptors.request.use(
    (config) => {
        const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME)
        const persistData = deepParseJson(rawPersistData)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let accessToken = (persistData as any).auth.session.token

        if (!accessToken) {
            const { auth } = store.getState()
            accessToken = auth.session.token
        }

        if (accessToken) {
            // Auto sign-out if JWT is expired
            if (isTokenExpired(accessToken)) {
                localStorage.removeItem('token')
                store.dispatch(signOutSuccess())
                return Promise.reject(new Error('Token expired'))
            }
            config.headers[
                REQUEST_HEADER_AUTH_KEY
            ] = `${TOKEN_TYPE}${accessToken}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

BaseService.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error

        if (response && unauthorizedCode.includes(response.status)) {
            store.dispatch(signOutSuccess())
        }

        return Promise.reject(error)
    }
)

export default BaseService
