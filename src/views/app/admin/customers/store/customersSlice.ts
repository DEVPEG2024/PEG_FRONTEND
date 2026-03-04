import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  apiGetCustomers,
  apiDeleteCustomer,
  apiGetCustomerForEditById,
} from '@/services/CustomerServices'
import type { Customer } from '@/@types/customer'

type GetCustomersParams = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
}

const extractCustomers = (payload: any): Customer[] => {
  // cas fréquents:
  // payload = { data: [...], meta: {...} }
  // payload = { data: { data: [...] , meta: {...}} }
  // payload = { customers: [...] }
  return (
    payload?.data?.data ||
    payload?.data ||
    payload?.customers ||
    payload?.results ||
    []
  )
}

const extractTotal = (payload: any): number => {
  return (
    payload?.meta?.pagination?.total ??
    payload?.data?.meta?.pagination?.total ??
    payload?.total ??
    0
  )
}

export const getCustomers = createAsyncThunk(
  'customers/getCustomers',
  async (params: GetCustomersParams) => {
    const res: any = await apiGetCustomers(params)
    // souvent axios: res.data
    return res?.data ?? res
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string) => {
    await apiDeleteCustomer(id)
    return id
  }
)

export const getCustomerForEditById = createAsyncThunk(
  'customers/getCustomerForEditById',
  async (id: string) => {
    const res: any = await apiGetCustomerForEditById(id)
    return res?.data ?? res
  }
)

type CustomersState = {
  data: {
    loading: boolean
    customers: Customer[]
    total: number
  }
  selectedCustomer: Customer | null
}

const initialState: CustomersState = {
  data: {
    loading: false,
    customers: [],
    total: 0,
  },
  selectedCustomer: null,
}

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setCustomer: (state, action) => {
      state.selectedCustomer = action.payload
    },
    clearCustomer: (state) => {
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
        state.data.customers = extractCustomers(action.payload)
        state.data.total = extractTotal(action.payload)
      })
      .addCase(getCustomers.rejected, (state) => {
        state.data.loading = false
        state.data.customers = []
        state.data.total = 0
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.data.customers = state.data.customers.filter(
          (c) => c.documentId !== action.payload
        )
        state.data.total = Math.max(0, state.data.total - 1)
      })
      .addCase(getCustomerForEditById.fulfilled, (state, action) => {
        // action.payload peut être direct customer ou {data: customer}
        state.selectedCustomer = action.payload?.data ?? action.payload
      })
  },
})

export const { setCustomer, clearCustomer } = customersSlice.actions
export default customersSlice.reducer