import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { ProductCategory } from '@/@types/product'
import { AxiosResponse } from 'axios'

// delete product category
export type DeleteProductCategoryResponse = {
    documentId: string
}

export async function apiDeleteProductCategory(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteProductCategory: DeleteProductCategoryResponse}>>> {
    const query = `
    mutation DeleteProductCategory($documentId: ID!) {
        deleteProductCategory(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteProductCategory: DeleteProductCategoryResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// create product category
export type CreateProductCategoryRequest = Omit<ProductCategory, "documentId">

export async function apiCreateProductCategory(data: CreateProductCategoryRequest): Promise<AxiosResponse<ApiResponse<{createProductCategory: ProductCategory}>>> {
    const query = `
    mutation CreateProductCategory($data: ProductCategoryInput!) {
        createProductCategory(data: $data) {
            documentId
            image {
                url
                documentId
            }
            name
            active
            order
            products (pagination: {limit: 100}){
                documentId
            }
            parent {
                documentId
                name
            }
            subcategories {
                documentId
                name
                order
                active
                image { url documentId }
                products (pagination: {limit: 100}) { documentId }
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{createProductCategory: ProductCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update product category
export async function apiUpdateProductCategory(productCategory: Partial<ProductCategory>): Promise<AxiosResponse<ApiResponse<{updateProductCategory: ProductCategory}>>> {
    const query = `
    mutation UpdateProductCategory($documentId: ID!, $data: ProductCategoryInput!) {
        updateProductCategory(documentId: $documentId, data: $data) {
            documentId
            image {
                url
                documentId
            }
            name
            active
            order
            products (pagination: {limit: 100}){
                documentId
            }
            parent {
                documentId
                name
            }
            subcategories {
                documentId
                name
                order
                active
                image { url documentId }
                products (pagination: {limit: 100}) { documentId }
            }
        }
    }
  `,
  {documentId, ...data} = productCategory,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateProductCategory: ProductCategory}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get product categories
export type GetProductCategoriesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
    /**
     * Ne remonter que les catégories ayant AU MOINS UN produit visible par le
     * client (active + inCatalogue). Réservé aux écrans CLIENT.
     *
     * ⚠️ NE PAS filtrer sur `productCategory.active` : mesuré sur l'intégration
     * le 05/09/2026, ce champ n'est pas maintenu — les huit vraies catégories
     * PEG (Vêtement personnalisé, Print, Signalétique & PLV…) l'ont à `null`,
     * et les seules à `true` étaient celles créées automatiquement par l'import
     * Imbretex. Filtrer sur `active` masquerait donc tout le catalogue et ne
     * laisserait que la taxonomie du fournisseur : exactement l'inverse du but.
     *
     * Le filtre par contenu s'auto-entretient : une catégorie sort du catalogue
     * dès qu'elle n'a plus rien à montrer, et y revient dès qu'un produit y
     * devient visible. Les écrans ADMIN doivent l'omettre.
     */
    onlyWithVisibleProducts?: boolean;
  };

export type GetProductCategoriesResponse = {
    nodes: ProductCategory[]
    pageInfo: PageInfo
};

export async function apiGetProductCategories(data: GetProductCategoriesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{productCategories_connection: GetProductCategoriesResponse}>>> {
    const nameFilter = `{name: {containsi: $searchTerm}}`;
    const categoryFilters = data.onlyWithVisibleProducts
        ? `{and: [${nameFilter}, {products: {active: {eq: true}, inCatalogue: {eq: true}}}]}`
        : nameFilter;
    const query = `
    query GetProductCategories($searchTerm: String, $pagination: PaginationArg) {
        productCategories_connection (filters: ${categoryFilters}, pagination: $pagination, sort: "order:asc") {
            nodes {
                documentId
                image {
                    url
                    documentId
                }
                name
                active
                order
                products (pagination: {limit: 100}){
                    documentId
                }
                parent {
                    documentId
                    name
                }
                subcategories {
                    documentId
                    name
                    order
                    active
                    image { url documentId }
                    products (pagination: {limit: 100}) { documentId }
                }
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
    ...data
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
            active
            order
            image { url documentId }
            products (pagination: {limit: 100}) { documentId }
            parent { documentId name }
            subcategories {
                documentId
                name
                active
                order
                image { url documentId }
                products (pagination: {limit: 100}) { documentId }
            }
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