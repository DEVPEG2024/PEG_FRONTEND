import {  apiCreateProducer } from '@/services/ProducerServices'

export const createProducer = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiCreateProducer(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
