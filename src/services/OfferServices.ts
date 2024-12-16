import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IOffer } from '@/@types/offer'

// TODO: Services

type OfferResponse = {
    offers: IOffer[]
    total: number
    result: string
    message: string
}

export async function apiGetOffers(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<OfferResponse>({
        url: `${API_BASE_URL}/offers`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}