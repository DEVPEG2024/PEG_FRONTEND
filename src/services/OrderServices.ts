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
        url: `${API_BASE_URL}/secure/admin/orders`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// update order
export async function apiCancelOrder(id: string, paymentIntentId: string) {
    return ApiService.fetchData<OrderResponse>({
        url: `${API_BASE_URL}/secure/admin/orders/cancel/${id}`,
        method: 'put',
        data: { paymentIntentId }
    })
}

export async function apiRefundOrder(id: string, paymentIntentId: string, amount: number) {
    return ApiService.fetchData<OrderResponse>({
        url: `${API_BASE_URL}/secure/admin/orders/refund/${id}`,
        method: 'put',
        data: { paymentIntentId, amountToRefund : amount }
    })
}
