import ApiService from './ApiService'
import { IOrder } from '@/@types/order'
import { GET_ORDERS_API_URL, POST_ORDERS_API_URL, PUT_ORDER_STATUS_API_URL } from '@/constants/api.constant'

type OrdersResponse = {
    orders: IOrder[]
    total: number
    result: string
    message: string
}
export async function apiGetOrders(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<OrdersResponse>({
        url: GET_ORDERS_API_URL,
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
        url: `${GET_ORDERS_API_URL}` + '/' + id,
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
        url: POST_ORDERS_API_URL,
        method: 'post',
        data
    })
}

type UpdateOrderResponse = {
    order: IOrder;
};

// update status order
export async function apiUpdateStatusOrder(data: Record<string, unknown>) {
    return ApiService.fetchData<UpdateOrderResponse>({
        url: PUT_ORDER_STATUS_API_URL + '/' + data.orderId,
        method: 'put',
        data 
    })
}