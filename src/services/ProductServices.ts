import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IProduct } from '@/@types/product'

type GetProductByIdResponse = {
    product: IProduct
    message: string
    result: string
}

// get product by id
export async function apiGetProductById(id: string) {
    return ApiService.fetchData<GetProductByIdResponse>({
        url: `${API_BASE_URL}/products` + '/' + id,
        method: 'get'
    })
}

type CreateProductResponse = {
    product: IProduct
    message: string
    result: string
}

export async function apiNewProduct(data: IProduct) {
    return ApiService.fetchData<CreateProductResponse>({
        url: `${API_BASE_URL}/products/admin/create`,
        method: 'post',
        data: data
    })
}

type UpdateProductResponse = {
    product: IProduct
    message: string
    result: string
}

export async function apiUpdateProduct(data: IProduct) {
    return ApiService.fetchData<UpdateProductResponse>({
        url: `${API_BASE_URL}/products/admin/update`,
        method: 'put',
        data: data
    })
}

type ProductsResponse = {
    products: IProduct[]
    total: number
    result: string
    message: string
}
export async function apiGetProducts(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<ProductsResponse>({
        url: `${API_BASE_URL}/products/admin`,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

export async function apiGetProductsByCategory(id: string) {
    return ApiService.fetchData<ProductsResponse>({
        url: `${API_BASE_URL}/products/category/${id}`,
        method: 'get',
    })
}

type DeleteProductResponse = {
    product: IProduct
    message: string
    result: string
}

export async function apiDeleteProduct(id: string) {
    return ApiService.fetchData<DeleteProductResponse>({
        url: `${API_BASE_URL}/products/admin/delete/${id}`,
        method: 'delete',
    })
}


type PutStatusProductResponse = {
    product: IProduct
    message: string
    result: string
}

export async function apiPutStatusProduct(id: string) {
    return ApiService.fetchData<PutStatusProductResponse>({
        url: `${API_BASE_URL}/products/admin/update-status/${id}`,
        method: 'put',
    })
}

// GET PRODUCTS CUSTOMER

export async function apiGetProductsCustomer(page: number, pageSize: number, searchTerm: string = "",  userId: string, userCategoryId: string) {
    return ApiService.fetchData<ProductsResponse>({
        url: `${API_BASE_URL}/products/customer`,
        method: 'get',
        params: { page, pageSize, searchTerm,  userId, userCategoryId }
    })
}

