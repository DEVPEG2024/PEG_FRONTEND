import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { OrderItem } from '@/@types/orderItem'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'

export type PaymentInformations = {
    paymentMethod: string;
    paymentState: string;
    paymentDate: Date;
}

// Create order item
export type CreateOrderItemRequest = Omit<OrderItem, 'documentId'>

export async function apiCreateOrderItem(data: CreateOrderItemRequest): Promise<AxiosResponse<ApiResponse<{createOrderItem: OrderItem}>>> {
    const query = `
    mutation CreateOrderItem($data: OrderItemInput!) {
        createOrderItem(data: $data) {
            documentId
            price
            product {
                name
                price
            }
            sizeAndColorSelections
        }
    }
  `,
  variables = {
    data: {
        ...data,
        product: data.product.documentId,
        formAnswer: data.formAnswer?.documentId,
        customer: data.customer.documentId,
    }
  }
    return ApiService.fetchData<ApiResponse<{createOrderItem: OrderItem}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// Get order items
export type GetOrderItemsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetOrderItemsResponse = {
    nodes: OrderItem[]
    pageInfo: PageInfo
};

export async function apiGetOrderItems(data: GetOrderItemsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{orderItems_connection: GetOrderItemsResponse}>>> {
    const query = `
    query getOrderItems($searchTerm: String, $pagination: PaginationArg) {
        orderItems_connection(filters: {product: {name: {containsi: $searchTerm}}}, pagination: $pagination, sort: "createdAt:desc") {
            nodes {
                documentId
                price
                state
                product {
                    documentId
                    name
                    images {
                        url
                    }
                    price
                    sizes {
                        name
                        value
                    }
                    colors {
                        name
                        value
                    }
                    description
                    form {
                        documentId
                        fields
                    }
                }
                customer {
                    name
                }
                sizeAndColorSelections
                formAnswer {
                    answer
                }
                project {
                    documentId
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
    return ApiService.fetchData<ApiResponse<{orderItems_connection: GetOrderItemsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update orderItem
export async function apiUpdateOrderItem(orderItem: Partial<OrderItem>): Promise<AxiosResponse<ApiResponse<{updateOrderItem: OrderItem}>>> {
    const query = `
    mutation UpdateOrderItem($documentId: ID!, $data: OrderItemInput!) {
        updateOrderItem(documentId: $documentId, data: $data) {
            documentId
            price
            state
            product {
                documentId
                name
            }
            customer {
                name
            }
            sizeAndColorSelections
        }
    }
  `,
  {documentId, ...data} = orderItem,
  variables = {
    documentId,
    data
  }
    return ApiService.fetchData<ApiResponse<{updateOrderItem: OrderItem}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get order item by id
export async function apiGetOrderItemById(documentId: string): Promise<AxiosResponse<ApiResponse<{orderItem: OrderItem}>>> {
    const query = `
    query GetOrderItem($documentId: ID!) {
        orderItem(documentId: $documentId) {
            documentId
            price
            state
            product {
                documentId
                name
                images {
                    url
                }
                price
                description
                sizes {
                    name
                    value
                }
                colors {
                    name
                    value
                }
            }
            formAnswer {
                documentId
                answer
                form {
                    documentId
                    fields
                }
            }
            customer {
                name
            }
            sizeAndColorSelections
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{orderItem: OrderItem}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete order item
export type DeleteOrderItemResponse = {
    documentId: string
}

export async function apiDeleteOrderItem(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteOrderItem: DeleteOrderItemResponse}>>> {
    const query = `
    mutation DeleteOrderItem($documentId: ID!) {
        deleteOrderItem(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteOrderItem: DeleteOrderItemResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get pending order item linked to product
export async function apiGetPendingOrderItemsLinkedToProduct(productDocumentId: string): Promise<AxiosResponse<ApiResponse<{orderItems: OrderItem[]}>>> {
    const query = `
    query GetPendingOrderItemsLinkedToProduct($productDocumentId: ID!) {
        orderItems(filters: {
        and: [
            {product: {documentId: {eq: $productDocumentId}}},
            {state: {eq: "pending"}},
        ]}) {
            documentId
        }
    }
  `,
  variables = {
    productDocumentId
  }
    return ApiService.fetchData<ApiResponse<{orderItems: OrderItem[]}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}