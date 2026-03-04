import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { unwrapData } from '@/utils/serviceHelper'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'

export const SLICE_NAME = 'dashboardSuperAdmin'

export type ProjectStat = {
  documentId: string
  name: string
  state: string
  startDate: string
  endDate: string
  price: number
  customer: { name: string } | null
  producer: { name: string } | null
}

export type InvoiceStat = {
  documentId: string
  name: string
  amount: number
  totalAmount: number
  state: string
  paymentState: string
  date: string
  customer: { name: string } | null
}

export type TicketStat = {
  documentId: string
  state: string
}

export type StateData = {
  loading: boolean
  projectsTotal: number
  projects: ProjectStat[]
  customersTotal: number
  producersTotal: number
  ticketsTotal: number
  tickets: TicketStat[]
  invoices: InvoiceStat[]
}

const initialState: StateData = {
  loading: false,
  projectsTotal: 0,
  projects: [],
  customersTotal: 0,
  producersTotal: 0,
  ticketsTotal: 0,
  tickets: [],
  invoices: [],
}

export const getDashboardSuperAdminInformations = createAsyncThunk(
  SLICE_NAME + '/getDashboardSuperAdminInformations',
  async (): Promise<Omit<StateData, 'loading'>> => {
    const data = await unwrapData(apiGetDashboardSuperAdminInformations())
    return {
      projectsTotal: data.projects_connection?.pageInfo?.total ?? 0,
      projects: data.projects_connection?.nodes ?? [],
      customersTotal: data.customers_connection?.pageInfo?.total ?? 0,
      producersTotal: data.producers_connection?.pageInfo?.total ?? 0,
      ticketsTotal: data.tickets_connection?.pageInfo?.total ?? 0,
      tickets: data.tickets_connection?.nodes ?? [],
      invoices: data.invoices_connection?.nodes ?? [],
    }
  }
)

const dashboardSuperAdminSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getDashboardSuperAdminInformations.pending, (state) => {
      state.loading = true
    })
    builder.addCase(
      getDashboardSuperAdminInformations.fulfilled,
      (state, action) => {
        state.loading = false
        state.projectsTotal = action.payload.projectsTotal
        state.projects = action.payload.projects
        state.customersTotal = action.payload.customersTotal
        state.producersTotal = action.payload.producersTotal
        state.ticketsTotal = action.payload.ticketsTotal
        state.tickets = action.payload.tickets
        state.invoices = action.payload.invoices
      }
    )
    builder.addCase(getDashboardSuperAdminInformations.rejected, (state) => {
      state.loading = false
    })
  },
})

export default dashboardSuperAdminSlice.reducer
