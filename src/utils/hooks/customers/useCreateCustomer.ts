import {  apiCreateCustomer } from '@/services/CustomerServices'

export const createCustomer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiCreateCustomer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
