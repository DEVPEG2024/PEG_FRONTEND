import {  apiGetCustomers } from '@/services/CustomerServices'

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