import { Producer } from '@/@types/producer';
import ApiService from './ApiService'
import { IUser } from '@/@types/user'
import {
  DELETE_PRODUCERS_API_URL,
  GET_CATEGORIES_PRODUCERS_API_URL,
  GET_PRODUCERS_API_URL,
  POST_PRODUCERS_API_URL,
  PUT_PRODUCERS_API_URL,
  PUT_PRODUCERS_STATUS_API_URL,
} from "@/constants/api.constant";
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';
import { API_GRAPHQL_URL } from '@/configs/api.config';

// TODO: Services

type ProducerResponse = {
  producers: IUser[];
  total: number;
  result: string;
  message: string;
};

export interface ICategoryProducer {
    _id: string
    label: string
    value: string
    producers: number
}

type ProducerCategoryResponse = {
    result: boolean
    total: number
    message: string
    categories: ICategoryProducer[]
}

type ProducerCreateResponse = {
    result: boolean
    message: string
    customer: IUser
}

// get customers
export async function apiGetProducersOld(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<ProducerResponse>({
        url: GET_PRODUCERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create customer
export async function apiCreateProducer(data: Record<string, unknown>) {
    return ApiService.fetchData<ProducerCreateResponse>({
        url: POST_PRODUCERS_API_URL,
        method: 'post',
        data 
    })
}

// update customer
export async function apiUpdateProducer(data: Record<string, unknown>) {
    return ApiService.fetchData<ProducerResponse>({
        url: PUT_PRODUCERS_API_URL,
        method: 'put',
        data 
    })
}

// update status producer
export async function apiUpdateStatusProducer(data: Record<string, unknown>) {
    return ApiService.fetchData<ProducerResponse>({
        url: PUT_PRODUCERS_STATUS_API_URL,
        method: 'put',
        data 
    })
}

// delete producer
export async function apiDeleteProducer(data: Record<string, unknown>) {
    return ApiService.fetchData<ProducerResponse>({
        url: DELETE_PRODUCERS_API_URL,
        method: 'delete',
        data 
    })
}
// get categories producers
export async function apiGetCategoriesProducers(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<ProducerCategoryResponse>({
        url: GET_CATEGORIES_PRODUCERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// get producers
export type GetProducersRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProducersResponse = {
    nodes: Producer[]
    pageInfo: PageInfo
};

export async function apiGetProducers(data: GetProducersRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{producers_connection: GetProducersResponse}>>> {
    const query = `
    query GetProducers($searchTerm: String, $pagination: PaginationArg) {
        producers_connection(filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
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
    return ApiService.fetchData<ApiResponse<{producers_connection: GetProducersResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}