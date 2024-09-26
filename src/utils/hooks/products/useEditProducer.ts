import {  apiUpdateProducer, apiUpdateStatusProducer, apiDeleteProducer } from '@/services/ProducerServices'

export const editProducer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUpdateProducer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}


export const editStatusProducer = async (id: string) => {
    try {
        const resp = await apiUpdateStatusProducer({id})
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}


export const deleteProducer = async (id: string) => {
    try {
        const resp = await apiDeleteProducer({id})
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

