// src/views/app/admin/customers/store/customersSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  apiDeleteCustomer,
  apiGetCustomerForEditById,
  apiGetCustomers,
  DeleteCustomerResponse,
  GetCustomersRequest,
} from '@/services/CustomerServices'
import type { Customer } from '@/@types/customer'

type CustomersState = {
  data: {
    customers: Customer[]
    total: number
    loading: boolean
  }
  selectedCustomer?: Customer | null
}

const initialState: CustomersState = {
  data: {
    customers: [],
    total: 0,
    loading: false,
  },
  selectedCustomer: null,
}

// Helpers pour parser Strapi proprement
function extractList(res: any): { items: any[]; total: number } {
  const root = res?.data ?? res
  const items = root?.data ?? root ?? []
  const total =
    root?.meta?.pagination?.total ??
    root?.meta?.total ??
    (Array.isArray(items) ? items.length : 0)

  return { items: Array.isArray(items) ? items : [], total: Number(total) }
}

function mapStrapiCustomer(item: any): Customer {
  // Strapi item: { id, attributes: {...} }
  if (item?.attributes) {
    return {
      documentId: String(item.id),
      ...item.attributes,
    } as any
  }
  // Si déjà plat
  return item as Customer
}

export const getCustomers = createAsyncThunk(
  'customers/data/getCustomers',
  async (params: GetCustomersRequest) => {
    const res = await apiGetCustomers(params)
    const { items, total } = extractList(res)
    const customers = items.map(mapStrapiCustomer)
    return { customers, total }
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/data/deleteCustomer',
  async (customerId: string) => {
    const res = (await apiDeleteCustomer(customerId)) as DeleteCustomerResponse
    return { customerId, res }
  }
)

export const getCustomerForEditById = createAsyncThunk(
  'customers/data/getCustomerForEditById',
  async (customerId: string) => {
    const res = await apiGetCustomerForEditById(customerId)
    const root = res?.data ?? res
    const item = root?.data ?? root
    const customer = mapStrapiCustomer(item)
    return customer
  }
)

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCustomers.pending, (state) => {
        state.data.loading = true
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.data.loading = false
        state.data.customers = action.payload.customers
        state.data.total = action.payload.total
      })
      .addCase(getCustomers.rejected, (state) => {
        state.data.loading = false
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.data.customers = state.data.customers.filter(
          (c: any) => String(c.documentId) !== String(action.payload.customerId)
        )
        state.data.total = Math.max(0, state.data.total - 1)
      })
      .addCase(getCustomerForEditById.fulfilled, (state, action) => {
        state.selectedCustomer = action.payload
      })
  },
})

export const { clearSelectedCustomer } = customersSlice.actions
export default customersSlice.reducer