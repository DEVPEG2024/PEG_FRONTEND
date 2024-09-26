import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IOffer } from '@/@types/offer'

type OfferResponse = {
    offers: IOffer[]
    total: number
    result: string
    message: string
}

type CreateOfferResponse = {
    offer: IOffer
    message: string
    result: boolean
}

export async function apiNewOffer(data: IOffer) {
    return ApiService.fetchData<CreateOfferResponse>({
        url: `${API_BASE_URL}/offers/create`,
        method: 'post',
        data: data as unknown as Record<string, unknown>
    })
}

type UpdateOfferResponse = {
    offer: IOffer
    message: string
    result: boolean
}

export async function apiUpdateOffer(data: IOffer) {
    return ApiService.fetchData<UpdateOfferResponse>({
        url: `${API_BASE_URL}/offers/${data._id}`,
        method: 'put',
        data: data as unknown as Record<string, unknown>
    })
}

export async function apiGetOffers(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<OfferResponse>({
        url: `${API_BASE_URL}/offers`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

type DeleteOfferResponse = {
    offer: IOffer
    message: string
    result: string
}

export async function apiDeleteOffer(id: string) {
    return ApiService.fetchData<DeleteOfferResponse>({
        url: `${API_BASE_URL}/offers/${id}`,
        method: 'delete',
    })
}


type PutStatusOfferResponse = {
    offer: IOffer
    message: string
    result: string
}

export async function apiPutStatusOffer(id: string) {
    return ApiService.fetchData<PutStatusOfferResponse>({
        url: `${API_BASE_URL}/offers/update-status/${id}`,
        method: 'put',
    })
}
