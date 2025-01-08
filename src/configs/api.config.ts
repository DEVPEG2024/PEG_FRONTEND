import { env } from "./env.config";

export const API_BASE_URL = (env?.API_ENDPOINT_URL ?? '') + '/api'
export const API_GRAPHQL_URL = (env?.API_ENDPOINT_URL ?? '') + '/graphql'

