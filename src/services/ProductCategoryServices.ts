import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Category } from '@/@types/category'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { Product, ProductCategory } from '@/@types/product'
import { AxiosResponse } from 'axios'

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


// get product categories
export type GetProductCategoriesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProductCategoriesResponse = {
    nodes: ProductCategory[]
    pageInfo: PageInfo
};

export async function apiGetProductCategories(data: GetProductCategoriesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{productCategories_connection: GetProductCategoriesResponse}>>> {
    const query = `
    query GetProductCategories {
        productCategories_connection {
            nodes {
                documentId
                image {
                    url
                }
                name
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{productCategories_connection: GetProductCategoriesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get product category by id
export async function apiGetProductCategoryById(documentId: string): Promise<AxiosResponse<ApiResponse<{productCategory: ProductCategory}>>> {
    const query = `
    query GetProductCategory($documentId: ID!) {
        productCategory(documentId: $documentId) {
            documentId
            name
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{productCategory: ProductCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}