import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IOrder } from '@/@types/order'

type OrderResponse = {
    orders: IOrder[]
    total: number
    result: string
    message: string
}
export async function apiGetOrders(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<OrderResponse>({
        url: `${API_BASE_URL}/orders`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

type GetOrderByIdResponse = {
    order: IOrder
    message: string
    result: string
}

// get order by id
export async function apiGetOrderById(id: string) {
    return ApiService.fetchData<GetOrderByIdResponse>({
        url: `${API_BASE_URL}/orders` + '/' + id,
        method: 'get'
    })
}

type CreateOrderResponse = {
    order: IOrder
    message: string
    result: string
}

export async function apiCreateOrder(data: Record<string, unknown>) {
    return ApiService.fetchData<CreateOrderResponse>({
        url: `${API_BASE_URL}/orders/create`,
        method: 'post',
        data
    })
}

type UpdateOrderResponse = {
    order: IOrder
    message: string
    result: string
}

export async function apiUpdateOrder(data: IOrder) {
    return ApiService.fetchData<UpdateOrderResponse>({
        url: `${API_BASE_URL}/orders/update`,
        method: 'put',
        data
    })
}