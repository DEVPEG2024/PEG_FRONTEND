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
        orderItems_connection(filters: {product: {name: {contains: $searchTerm}}}, pagination: $pagination) {
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
                    description
                    form {
                        documentId
                        fields
                    }
                }
                customer {
                    name
                }
                sizeSelections
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
            sizeSelections
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
            sizeSelections
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