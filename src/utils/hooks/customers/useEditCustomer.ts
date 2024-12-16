import {  apiUpdateStatusCustomer, apiDeleteCustomer } from '@/services/CustomerServices'

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

