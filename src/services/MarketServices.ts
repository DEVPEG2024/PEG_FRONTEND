import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IMarket } from '@/@types/market'

type MarketResponse = {
    stores: IMarket[]
    total: number
    result: string
    message: string
}
export async function apiGetMarkets() {
    return ApiService.fetchData<MarketResponse>({
        url: `${API_BASE_URL}/secure/admin/markets`,
        method: 'get',
    })
}

// delete category
export async function apiUpdateMarket(id: string) {
    return ApiService.fetchData<MarketResponse>({
        url: `${API_BASE_URL}/secure/admin/markets/${id}`,
        method: 'put',
    })
}
