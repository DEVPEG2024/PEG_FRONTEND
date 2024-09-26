import {  apiGetProducers, apiUpdateProducer } from '@/services/ProducerServices'

export default function useProducer() {
    const getProducers = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetProducers(page, pageSize, searchTerm)
            const total = resp.data.total
            return {data: resp.data.producers, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getProducers,
    }
}

export const updateProducer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUpdateProducer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
