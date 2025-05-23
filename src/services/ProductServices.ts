import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { Product } from '@/@types/product'
import { AxiosResponse } from 'axios'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'

// get product by id for show
export async function apiGetProductForShowById(documentId: string): Promise<AxiosResponse<ApiResponse<{product: Product}>>> {
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
            colors {
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

// get product for edit by id
export async function apiGetProductForEditById(documentId: string): Promise<AxiosResponse<ApiResponse<{product: Product}>>> {
    const query = `
    query GetProductForEditById($documentId: ID!) {
        product(documentId: $documentId) {
            documentId
            description
            name
            price
            images {
                documentId
                url
                name
            }
            active
            inCatalogue
            sizes {
                documentId
                name
                value
            }
            colors {
                documentId
                name
                value
            }
            form {
                documentId
                fields
            }
            customerCategories (pagination: {limit: 100}){
                documentId
            }
            productCategory {
                documentId
                name
            }
            customers (pagination: {limit: 100}){
                documentId
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

// get products
export type GetProductsByCategoryRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
    productCategoryDocumentId: string;
};

export async function apiGetProductsByCategory(data: GetProductsByCategoryRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: '', productCategoryDocumentId: ''}): Promise<AxiosResponse<ApiResponse<{products_connection: GetProductsResponse}>>> {
    const query = `
    query getProductsByCategory($searchTerm: String, $productCategoryDocumentId: ID!, $pagination: PaginationArg) {
        products_connection (filters: {
        and: [
            {name: {containsi: $searchTerm}},
            {productCategory: {documentId: {eq: $productCategoryDocumentId}}},
            {active: {eq: true}},
            {inCatalogue: {eq: true}}
        ]},
        pagination: $pagination, sort: "name") {
            nodes {
                documentId
                name
                price
                images {
                    documentId
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
    ...data
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
        products_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination, sort: "name") {
            nodes {
                documentId
                name
                price
                images {
                    documentId
                    url
                }
                active
                inCatalogue
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
    ...data
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
            name
            price
            images {
                documentId
                url
            }
            active
            inCatalogue
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
                name: {containsi: $searchTerm}
            }, {
                active: {eq: true}
            }
            ]
        }, pagination: $pagination) {
            nodes {
                images {
                    url
                }
                description
                documentId
                name
                price
                inCatalogue
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

// update product
export async function apiUpdateProduct(product: Partial<Product>): Promise<AxiosResponse<ApiResponse<{updateProduct: Product}>>> {
    const query = `
    mutation UpdateProduct($documentId: ID!, $data: ProductInput!) {
        updateProduct(documentId: $documentId, data: $data) {
            documentId
            name
            price
            images {
                documentId
                url
            }
            active
            inCatalogue
        }
    }
  `,
  {documentId, ...data} = product,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateProduct: Product}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}