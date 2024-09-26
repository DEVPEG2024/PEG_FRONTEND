import {  apiGetCustomers, apiUpdateCustomer } from '@/services/CustomerServices'

export default function useCustomer() {
    const getCustomers = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetCustomers(page, pageSize, searchTerm)
            const total = resp.data.total
            return {data: resp.data.customers, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getCustomers,
    }
}

export const updateCustomer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUpdateCustomer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
