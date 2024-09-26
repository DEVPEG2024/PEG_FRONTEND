import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Category } from '@/@types/category'

type CategoryProductResponse = {
    categories: Category[]
    total: number
    result: string
    message: string
}
export async function apiGetCategoriesProduct(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<CategoryProductResponse>({
        url: `${API_BASE_URL}/products/admin/category-product`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

type CreateCategoryProductResponse = {
    image: string   
    title: string
}

export async function apiNewCategoryProduct(data: CreateCategoryProductResponse) {
    return ApiService.fetchData<CategoryProductResponse>({
        url: `${API_BASE_URL}/products/admin/category-product/create`,
        method: 'post',
        data: data
    })
}

// delete category
export async function apiDeleteCategoryProduct(id: string) {
    return ApiService.fetchData<CategoryProductResponse>({
        url: `${API_BASE_URL}/products/admin/category-product/delete/${id}`,
        method: 'delete',
    })
}
