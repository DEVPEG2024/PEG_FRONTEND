import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IProduct, Product } from '@/@types/product'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo } from '@/utils/serviceHelper'

export async function apiGetProductById(documentId: string): Promise<AxiosResponse<ApiResponse<{product: Product}>>> {
    const query = `
    query GetProduct($documentId: ID!) {
        product(documentId: $documentId) {
            description
            name
            price
            images {
                url
            }
            sizes {
                name
                value
            }
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{product: Product}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
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
export async function apiGetCustomerProductsREST(customerDocumentId: string, customerCategoryDocumentId: string, pagination: {page: number, pageSize:number} = {page: 1, pageSize: 10}, searchTerm: string = ''): Promise<AxiosResponse<ApiResponse<Product[]>>> {
    return ApiService.fetchData<ApiResponse<Product[]>>({
        url: API_BASE_URL + '/products?filters[$and][0][$or][0][customers][documentId][$eq]=' + customerDocumentId + '&filters[$and][0][$or][1][customer_categories][documentId][$eq]=' + customerCategoryDocumentId + '&filters[$and][1][name][$contains]=' + searchTerm + '&populate[images][fields][0]=url&fields[0]=active&fields[1]=description&fields[2]=documentId&fields[3]=name&fields[4]=price&pagination[pageSize]=' + pagination.pageSize + '&pagination[page]=' + pagination.page,
        method: 'get'
    })
}

export type CustomerProductsResponse = {
    nodes: Product[],
    pageInfo: PageInfo
  }

export async function apiGetCustomerProducts(customerDocumentId: string, customerCategoryDocumentId: string, pagination: {page: number, pageSize:number} = {page: 1, pageSize: 10}, searchTerm: string = ''): Promise<AxiosResponse<ApiResponse<{products_connection: CustomerProductsResponse}>>> {
    const query = `
    query GetCustomerProducts($customerDocumentId: ID!, $customerCategoryDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        products_connection(filters: {
            and: [
            {
                or: [
                {
                    customers: {
                    documentId: {eq: $customerDocumentId}
                    }
                }, {
                    customer_categories: {
                    documentId: {eq: $customerCategoryDocumentId}
                    }
                }
                ]
            }, {
                name: {contains: $searchTerm}
            }
            ]
        }, pagination: $pagination) {
            nodes {
                images {
                    url
                }
                active
                description
                documentId
                name
                price
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
    customerDocumentId,
    customerCategoryDocumentId,
    searchTerm,
    pagination
  }
    return ApiService.fetchData<ApiResponse<{products_connection: CustomerProductsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
        query,
        variables
        }
    })
}