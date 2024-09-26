import {  apiUpdateCustomer, apiUpdateStatusCustomer, apiDeleteCustomer } from '@/services/CustomerServices'

export const editCustomer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUpdateCustomer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}


export const editStatusCustomer = async (id: string) => {
    try {
        const resp = await apiUpdateStatusCustomer({id})
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}


export const deleteCustomer = async (id: string) => {
    try {
        const resp = await apiDeleteCustomer({id})
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

