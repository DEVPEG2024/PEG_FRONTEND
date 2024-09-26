import { apiGetOrders,  apiCancelOrder, apiRefundOrder } from '@/services/OrderServices'

export default function useOrders() {
    const getOrders = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetOrders(page, pageSize, searchTerm)
            const total = resp.data.total
            const orders = resp.data.orders 
            return {data: orders, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getOrders,
    }
}

export const cancelOrder = async (id: string, paymentIntentId: string) => {
    try {
        const resp = await apiCancelOrder(id, paymentIntentId)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

export const refundOrder = async (id: string, paymentIntentId: string, amount: number) => {
    try {
        const resp = await apiRefundOrder(id, paymentIntentId, amount)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
