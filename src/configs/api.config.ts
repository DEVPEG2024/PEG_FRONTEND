import { env } from "./env.config";

export const API_BASE_URL = (env?.API_ENDPOINT_URL ?? '') + '/api'
export const API_GRAPHQL_URL = (env?.API_ENDPOINT_URL ?? '') + '/graphql'
export const EXPRESS_BACKEND_URL = env?.EXPRESS_BACKEND_URL ?? 'http://localhost:3000'
export const PRINTAI_API_URL = env?.PRINTAI_API_URL ?? 'http://localhost:3001'

