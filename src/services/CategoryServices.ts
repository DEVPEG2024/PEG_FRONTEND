import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Category } from '@/@types/category'

type CategoryResponse = {
    categories: Category[]
    total: number
    result: string
    message: string
}
export async function apiGetCategories(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<CategoryResponse>({
        url: `${API_BASE_URL}/categories/admin`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// delete category
export async function apiDeleteCategory(id: string) {
    return ApiService.fetchData<CategoryResponse>({
        url: `${API_BASE_URL}/categories/${id}`,
        method: 'delete',
    })
}
