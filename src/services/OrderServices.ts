import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IOrder, OrderItem, Order } from '@/@types/order'
import { GET_ORDERS_API_URL, POST_ORDERS_API_URL, PUT_ORDER_PAYMENT_STATUS_API_URL, PUT_ORDER_STATUS_API_URL } from '@/constants/api.constant'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'

export type PaymentInformations = {
    paymentMethod: string;
    paymentStatus: string;
    paymentDate: Date;
}

// Create order item
export type CreateOrderItemRequest = Omit<OrderItem, 'documentId'>

export async function apiCreateOrderItem(data: CreateOrderItemRequest): Promise<AxiosResponse<ApiResponse<{createOrderItem: OrderItem}>>> {
    const query = `
    mutation CreateOrderItem($data: OrderItemInput!) {
        createOrderItem(data: $data) {
            documentId
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

// Create order
export type CreateOrderRequest = Omit<Order, 'documentId'>

// A supprimer
export async function apiCreateOrder(data: CreateOrderRequest): Promise<AxiosResponse<ApiResponse<{createOrder: Order}>>> {
    const query = `
    mutation CreateOrder($data: OrderInput!) {
        createOrder(data: $data) {
            documentId
        }
    }
  `,
  variables = {
    data: {
        orderItems: data.orderItems.map((orderItem) => orderItem.documentId),
        customer: data.customer.documentId,
        paymentState: data.paymentState
    }
  }
    return ApiService.fetchData<ApiResponse<{createOrder: Order}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

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
                paymentState
                formAnswer {
                    answer
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
    data
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
            paymentState
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



type OrdersResponse = {
    orders: IOrder[]
    total: number
    result: string
    message: string
}
export async function apiGetOrders(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<OrdersResponse>({
        url: GET_ORDERS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

type GetOrderByIdResponse = {
    order: IOrder
    message: string
    result: string
}

// get order by id
export async function apiGetOrderById(id: string) {
    return ApiService.fetchData<GetOrderByIdResponse>({
        url: `${GET_ORDERS_API_URL}` + '/' + id,
        method: 'get'
    })
}

type UpdateOrderResponse = {
    order: IOrder;
};

// update status order
export async function apiUpdateStatusOrder(data: Record<string, unknown>) {
    return ApiService.fetchData<UpdateOrderResponse>({
        url: PUT_ORDER_STATUS_API_URL,
        method: 'put',
        data 
    })
}

// update payment status order
export async function apiUpdatePaymentStatusOrder(data: Record<string, unknown>) {
    return ApiService.fetchData<UpdateOrderResponse>({
        url: PUT_ORDER_PAYMENT_STATUS_API_URL,
        method: 'put',
        data 
    })
}