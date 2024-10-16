import ApiService from './ApiService'
import {
  DELETE_BANNERS_API_URL,
  GET_BANNERS_API_URL,
  POST_BANNERS_API_URL,
  PUT_BANNERS_API_URL,
  PUT_BANNERS_STATUS_API_URL,
} from "@/constants/api.constant";
import { IBanner } from '@/@types/banner';

type BannersResponse = {
  banners: IBanner[];
  total: number;
  result: string;
  message: string;
};

type BannerResponse = {
  banner: IBanner;
  bannerId: string;
};

type BannersCreateResponse = {
    result: boolean
    message: string
    banner: IBanner
}

type BannersDeleteResponse = {
    bannerId: string
    result: boolean
    message: string
}

// get banners
export async function apiGetBanners(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<BannersResponse>({
        url: GET_BANNERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create banner
export async function apiCreateBanner(data: Record<string, unknown>) {
    return ApiService.fetchData<BannersCreateResponse>({
        url: POST_BANNERS_API_URL,
        method: 'post',
        data 
    })
}

// update banner
export async function apiUpdateBanner(data: Record<string, unknown>) {
        return ApiService.fetchData<BannersCreateResponse>({
        url: PUT_BANNERS_API_URL +'/' + data.bannerId,
        method: 'put',
        data 
    })
}

// update status banner
export async function apiUpdateStatusBanner(data: Record<string, unknown>) {
    return ApiService.fetchData<BannerResponse>({
        url: PUT_BANNERS_STATUS_API_URL + '/' + data.bannerId,
        method: 'put',
        data 
    })
}

// delete banner
export async function apiDeleteBanner(data: Record<string, unknown>) {
        return ApiService.fetchData<BannersDeleteResponse>({
        url: DELETE_BANNERS_API_URL + '/' + data.bannerId,
        method: 'delete',
    })
}
