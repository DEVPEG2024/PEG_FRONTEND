import { API_BASE_URL } from "@/configs/api.config"

export const TOKEN_TYPE = 'Bearer '
export const REQUEST_HEADER_AUTH_KEY = 'Authorization'

// AUTH
export const LOGIN_API_URL = API_BASE_URL + '/auth/local/'
export const REGISTER_API_URL = API_BASE_URL + '/auth/register/'

// PROJECTS
export const PAY_PRODUCER_API_URL = API_BASE_URL + '/wallets/admin/pay-producer'
