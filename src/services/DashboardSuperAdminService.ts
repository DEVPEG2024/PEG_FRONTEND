import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { AxiosResponse } from 'axios'
import { ApiResponse } from '@/utils/serviceHelper'

export type DashboardSuperAdminData = {
  projectsCount: number
  projectsByState: { state: string; count: number }[]
  customersCount: number
  producersCount: number
  usersCount: number
  ticketsCount: number
  ticketsByState: { state: string; count: number }[]
  recentProjects: {
    documentId: string
    name: string
    state: string
    startDate: string
    endDate: string
    customer: { name: string } | null
    producer: { name: string } | null
    price: number
  }[]
  invoicesStats: {
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }
  recentInvoices: {
    documentId: string
    name: string
    amount: number
    totalAmount: number
    state: string
    paymentState: string
    date: string
    customer: { name: string } | null
  }[]
}

export async function apiGetDashboardSuperAdminInformations(): Promise<
  AxiosResponse<ApiResponse<{
    projects_connection: { nodes: any[]; pageInfo: { total: number } }
    customers_connection: { pageInfo: { total: number } }
    producers_connection: { pageInfo: { total: number } }
    usersPermissionsUsers: { meta: { pagination: { total: number } } }
    tickets_connection: { nodes: any[]; pageInfo: { total: number } }
    invoices_connection: { nodes: any[] }
  }>>
> {
  const query = `
    query DashboardSuperAdminQuery {
      projects_connection(pagination: { limit: -1 }) {
        nodes {
          documentId
          name
          state
          startDate
          endDate
          price
          paidPrice
          producerPrice
          producerPaidPrice
          customer {
            name
          }
          producer {
            name
          }
          invoices(pagination: { limit: 1 }) {
            documentId
          }
        }
        pageInfo {
          total
        }
      }
      customers_connection {
        pageInfo {
          total
        }
      }
      producers_connection {
        pageInfo {
          total
        }
      }
      tickets_connection(pagination: { limit: -1 }) {
        nodes {
          documentId
          state
        }
        pageInfo {
          total
        }
      }
      invoices_connection(pagination: { limit: -1 }) {
        nodes {
          documentId
          name
          amount
          totalAmount
          state
          paymentState
          date
          dueDate
          customer {
            name
          }
        }
      }
      orderItems_connection(pagination: { limit: -1 }, sort: "createdAt:desc") {
        nodes {
          documentId
          price
          state
          product {
            name
          }
          customer {
            name
          }
        }
        pageInfo {
          total
        }
      }
      transactions_connection(pagination: { limit: -1 }) {
        nodes {
          documentId
          amount
          type
          date
          producer {
            name
          }
          project {
            name
          }
        }
        pageInfo {
          total
        }
      }
    }
  `

  return ApiService.fetchData<
    ApiResponse<{
      projects_connection: { nodes: any[]; pageInfo: { total: number } }
      customers_connection: { pageInfo: { total: number } }
      producers_connection: { pageInfo: { total: number } }
      usersPermissionsUsers: { meta: { pagination: { total: number } } }
      tickets_connection: { nodes: any[]; pageInfo: { total: number } }
      invoices_connection: { nodes: any[] }
      orderItems_connection: { nodes: any[]; pageInfo: { total: number } }
      transactions_connection: { nodes: any[]; pageInfo: { total: number } }
    }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query },
  })
}
