import { apiGetMarkets, apiUpdateMarket } from '@/services/MarketServices'

export default function useMarkets() {
    const getMarkets = async () => {
        try {   
            const resp = await apiGetMarkets()
            const total = resp.data.total
            return {data: resp.data.stores, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getMarkets,
    }
}

export const updateMarket = async (id: string) => {
    try {
        const resp = await apiUpdateMarket(id)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
