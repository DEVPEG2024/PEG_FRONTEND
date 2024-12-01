import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IProduct, Product } from '@/@types/product'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'

export async function apiGetProductById(documentId: string): Promise<AxiosResponse<ApiResponse<{product: Product}>>> {
    const query = `
    query GetProduct($documentId: ID!) {
        product(documentId: $documentId) {
            documentId
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
            form {
                documentId
                fields
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

// get products
export type GetProductsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetProductsResponse = {
    nodes: Product[]
    pageInfo: PageInfo
};

export async function apiGetProducts(data: GetProductsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{products_connection: GetProductsResponse}>>> {
    const query = `
    query getProducts($searchTerm: String, $pagination: PaginationArg) {
        products_connection (filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                price
                images {
                    url
                }
            }
            pageInfo {
                page
                pageSize
                pageCount
                total
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{products_connection: GetProductsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create product
export type CreateProductRequest = Omit<Product, "documentId">

export async function apiCreateProduct(data: CreateProductRequest): Promise<AxiosResponse<ApiResponse<{createProduct: Product}>>> {
    const query = `
    mutation CreateProduct($data: ProductInput!) {
        createProduct(data: $data) {
            documentId
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createProduct: Product}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

type ProductsResponse = {
    products: IProduct[]
    total: number
    result: string
    message: string
}

export async function apiGetProductsByCategory(id: string) {
    return ApiService.fetchData<ProductsResponse>({
        url: `${API_BASE_URL}/products/category/${id}`,
        method: 'get',
    })
}

// delete product
export type DeleteProductResponse = {
    documentId: string
}

export async function apiDeleteProduct(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteProduct: DeleteProductResponse}>>> {
    const query = `
    mutation DeleteProduct($documentId: ID!) {
        deleteProduct(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteProduct: DeleteProductResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
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
                    customerCategories: {
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