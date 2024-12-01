import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IOrder, OrderItem, Order } from '@/@types/order'
import { GET_ORDERS_API_URL, POST_ORDERS_API_URL, PUT_ORDER_PAYMENT_STATUS_API_URL, PUT_ORDER_STATUS_API_URL } from '@/constants/api.constant'
import { ApiResponse } from '@/utils/serviceHelper'
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
        product: data.product.documentId,
        sizeSelections: data.sizeSelections,
        formAnswer: data.formAnswer?.documentId,
        price: data.price
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