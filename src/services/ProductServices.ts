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
            priceTiers
            pricingMode
            pricePerM2
            minM2
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
            # requiresBat                          — activer après déploiement Strapi
            # batFile { documentId url name }      — activer après déploiement Strapi
            # catalogPrice                         — activer après déploiement Strapi
            # checklist { documentId name items }  — activer après config Strapi
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
            priceTiers
            pricingMode
            pricePerM2
            minM2
            cost
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
            # checklist { documentId name items }  — activer après déploiement Strapi
            # requiresBat                          — activer après déploiement Strapi
            # batFile { documentId url name }      — activer après déploiement Strapi
            # catalogPrice                         — activer après déploiement Strapi
            productRef
            refVisibleToCustomer
            customerCategories {
                documentId
            }
            productCategory {
                documentId
                name
            }
            customers {
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
                priceTiers
                pricingMode
                pricePerM2
                minM2
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
                priceTiers
                cost
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
            priceTiers
            cost
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

// Export all products for CSV
export async function apiGetAllProductsForExport(): Promise<AxiosResponse<ApiResponse<{products: Product[]}>>> {
    const query = `
    query GetAllProductsForExport {
        products(pagination: {limit: -1}, sort: "name") {
            documentId
            name
            description
            price
            priceTiers
            active
            inCatalogue
            # productRef                           — activer après déploiement Strapi
            # requiresBat                          — activer après déploiement Strapi
            # checklist { name }                   — activer après config Strapi
            sizes {
                name
                value
            }
            colors {
                name
                value
            }
            productCategory {
                name
            }
            customerCategories {
                name
            }
            customers {
                name
            }
            form {
                name
            }
            images {
                url
            }
        }
    }
  `
    return ApiService.fetchData<ApiResponse<{products: Product[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query }
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
                priceTiers
                pricingMode
            pricePerM2
            minM2
                inCatalogue
                # catalogPrice                         — activer après déploiement Strapi
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

// ─── Suggestions catalogue (onglet client « Nos suggestions ») ───────────────
// Le champ booléen `suggested` doit être ajouté au schéma produit côté
// peg_strapi (backend d'abord, comme catalogPrice). Tant qu'il n'est pas
// déployé, on sonde sa disponibilité une fois (cache mémoire) et on se replie
// sur les nouveautés du catalogue.
//
// ⚠️ La sonde utilise l'INTROSPECTION (__type), PAS un filtre `suggested`.
// Filtrer sur un champ inexistant fait renvoyer un HTTP 400 par Strapi, et ses
// réponses d'erreur ne portent pas les en-têtes CORS → le navigateur affiche
// une avalanche d'erreurs « No Access-Control-Allow-Origin » sur chaque page
// produit. L'introspection est toujours une requête valide (statut 200).

let suggestedFieldAvailable: boolean | null = null;

export async function apiIsSuggestedFieldAvailable(): Promise<boolean> {
    if (suggestedFieldAvailable !== null) return suggestedFieldAvailable;
    try {
        const response = await ApiService.fetchData<
            ApiResponse<{ __type: { fields: { name: string }[] | null } | null }>
        >({
            url: API_GRAPHQL_URL,
            method: 'post',
            data: {
                query: `query ProbeSuggestedField { __type(name: "Product") { fields { name } } }`,
            },
        });
        const fields = response.data?.data?.__type?.fields;
        suggestedFieldAvailable =
            Array.isArray(fields) && fields.some((f) => f.name === 'suggested');
    } catch {
        suggestedFieldAvailable = false;
    }
    return suggestedFieldAvailable;
}

const SUGGESTED_PRODUCT_FIELDS = `
                images {
                    url
                }
                description
                documentId
                name
                price
                priceTiers
                pricingMode
                pricePerM2
                minM2
                productCategory {
                    documentId
                    name
                }`;

export type SuggestedProductsResult = {
    products: Product[];
    /** true = sélection marquée par l'admin (champ suggested), false = fallback nouveautés */
    curated: boolean;
};

export async function apiGetSuggestedProducts(): Promise<SuggestedProductsResult> {
    if (await apiIsSuggestedFieldAvailable()) {
        try {
            const response = await ApiService.fetchData<ApiResponse<{products_connection: GetProductsResponse}>>({
                url: API_GRAPHQL_URL,
                method: 'post',
                data: {
                    query: `
    query GetSuggestedProducts($pagination: PaginationArg) {
        products_connection (filters: {
        and: [
            {suggested: {eq: true}},
            {active: {eq: true}},
            {inCatalogue: {eq: true}}
        ]},
        pagination: $pagination, sort: "updatedAt:desc") {
            nodes {${SUGGESTED_PRODUCT_FIELDS}
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
                    variables: { pagination: { page: 1, pageSize: 24 } },
                },
            });
            const nodes = response.data.data?.products_connection?.nodes ?? [];
            if (nodes.length > 0) return { products: nodes, curated: true };
        } catch (error) {
            console.error('[Suggestions] Échec requête produits suggérés:', error);
        }
    }
    // Fallback : les nouveautés du catalogue
    const response = await ApiService.fetchData<ApiResponse<{products_connection: GetProductsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query: `
    query GetNewestCatalogueProducts($pagination: PaginationArg) {
        products_connection (filters: {
        and: [
            {active: {eq: true}},
            {inCatalogue: {eq: true}}
        ]},
        pagination: $pagination, sort: "createdAt:desc") {
            nodes {${SUGGESTED_PRODUCT_FIELDS}
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
            variables: { pagination: { page: 1, pageSize: 12 } },
        },
    });
    return { products: response.data.data?.products_connection?.nodes ?? [], curated: false };
}

// Lecture isolée du flag suggested d'un produit (formulaire admin) — requête
// séparée pour ne pas casser apiGetProductForEditById tant que le champ
// n'existe pas côté Strapi.
export async function apiGetProductSuggestedFlag(documentId: string): Promise<boolean> {
    if (!(await apiIsSuggestedFieldAvailable())) return false;
    try {
        const response = await ApiService.fetchData<ApiResponse<{product: {suggested?: boolean}}>>({
            url: API_GRAPHQL_URL,
            method: 'post',
            data: {
                query: `
    query GetProductSuggestedFlag($documentId: ID!) {
        product(documentId: $documentId) {
            suggested
        }
    }
  `,
                variables: { documentId },
            },
        });
        return response.data.data?.product?.suggested ?? false;
    } catch {
        return false;
    }
}

// update product
export async function apiUpdateProduct(product: Partial<Product>): Promise<AxiosResponse<ApiResponse<{updateProduct: Product}>>> {
    const query = `
    mutation UpdateProduct($documentId: ID!, $data: ProductInput!) {
        updateProduct(documentId: $documentId, data: $data) {
            documentId
            name
            price
            priceTiers
            cost
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

// get orderItem by documentId (BAT data)
export async function apiGetOrderItem(documentId: string) {
    const query = `
    query GetOrderItem($documentId: ID!) {
        orderItem(documentId: $documentId) {
            documentId
            batStatus
            batComment
        }
    }`
    return ApiService.fetchData({ url: API_GRAPHQL_URL, method: 'post', data: { query, variables: { documentId } } })
}

// get customer's latest orderItem for a product (auto-fetch BAT in ShowProduct)
export async function apiGetOrderItemByProduct(productDocumentId: string, customerDocumentId: string) {
    const query = `
    query GetOrderItemByProduct($productDocumentId: ID!, $customerDocumentId: ID!) {
        orderItems(
            filters: {
                and: [
                    { product: { documentId: { eq: $productDocumentId } } }
                    { customer: { documentId: { eq: $customerDocumentId } } }
                ]
            }
            pagination: { pageSize: 1 }
            sort: ["createdAt:desc"]
        ) {
            documentId
            batStatus
            batComment
        }
    }`
    return ApiService.fetchData({ url: API_GRAPHQL_URL, method: 'post', data: { query, variables: { productDocumentId, customerDocumentId } } })
}

// update BAT file on product (admin uploads new BAT) + reset orderItem status to pending
export async function apiUpdateBatFile(productDocumentId: string, orderItemDocumentId: string, batFileDocumentId: string) {
    const updateProductQuery = `
    mutation UpdateProductBatFile($documentId: ID!, $data: ProductInput!) {
        updateProduct(documentId: $documentId, data: $data) {
            documentId
            batFile { documentId url name }
        }
    }`
    const res1 = await ApiService.fetchData<any>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query: updateProductQuery,
            variables: { documentId: productDocumentId, data: { batFile: batFileDocumentId } },
        },
    })
    if (res1.data?.errors?.length) {
        throw new Error(res1.data.errors[0].message)
    }
    const updateOrderItemQuery = `
    mutation ResetOrderItemBatStatus($documentId: ID!, $data: OrderItemInput!) {
        updateOrderItem(documentId: $documentId, data: $data) {
            documentId
            batStatus
        }
    }`
    const res2 = await ApiService.fetchData<any>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query: updateOrderItemQuery,
            variables: { documentId: orderItemDocumentId, data: { batStatus: 'pending', batComment: null } },
        },
    })
    if (res2.data?.errors?.length) {
        throw new Error(res2.data.errors[0].message)
    }
    return res2
}

// update BAT status on orderItem (client approval)
export async function apiUpdateBatStatus(
    orderItemDocumentId: string,
    batStatus: 'approved' | 'rejected',
    batComment?: string | null
) {
    const query = `
    mutation UpdateOrderItemBatStatus($documentId: ID!, $data: OrderItemInput!) {
        updateOrderItem(documentId: $documentId, data: $data) {
            documentId
            batStatus
            batComment
        }
    }`
    const res = await ApiService.fetchData<any>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables: {
                documentId: orderItemDocumentId,
                data: {
                    batStatus,
                    batComment: batComment ?? null,
                },
            },
        },
    })
    if (res.data?.errors?.length) {
        throw new Error(res.data.errors[0].message)
    }
    return res
}