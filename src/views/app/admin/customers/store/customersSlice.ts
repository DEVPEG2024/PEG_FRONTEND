// src/views/app/admin/customers/store/customersSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import {
  apiGetCustomers,
  apiDeleteCustomer,
  apiGetCustomerForEditById,
  type GetCustomersRequest,
} from '@/services/CustomerServices'

import type { Customer } from '@/@types/customer'

type CustomersState = {
  loading: boolean
  customers: Customer[]
  total: number
  customer: Customer | null
}

const initialState: CustomersState = {
  loading: false,
  customers: [],
  total: 0,
  customer: null,
}

/**
 * GET list customers (Strapi)
 * - support pagination + searchTerm
 */
export const getCustomers = createAsyncThunk(
  'customers/getCustomers',
  async (params: GetCustomersRequest) => {
    const res: any = await apiGetCustomers(params)
    // Strapi v4 renvoie souvent: { data: [...], meta: { pagination: { total } } }
    const data = res?.data?.data ?? res?.data ?? []
    const total = res?.data?.meta?.pagination?.total ?? data?.length ?? 0
    return { data, total }
  }
)

/**
 * GET customer by id (edit)
 */
export const getCustomerById = createAsyncThunk(
  'customers/getCustomerById',
  async (id: string) => {
    const res: any = await apiGetCustomerForEditById(id)
    const customer = res?.data?.data ?? res?.data ?? null
    return customer
  }
)

/**
 * DELETE customer
 */
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { dispatch }) => {
    await apiDeleteCustomer(id)
    // Optionnel: tu peux re-fetch la liste ici si tu veux, mais souvent c’est géré par le composant
    // dispatch(getCustomers({ pagination: { page: 1, pageSize: 10 }, searchTerm: '' }))
    return id
  }
)

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.customer = action.payload
    },
    clearCustomers: (state) => {
      state.customers = []
      state.total = 0
    },
  },
  extraReducers: (builder) => {
    builder
      // getCustomers
      .addCase(getCustomers.pending, (state) => {
        state.loading = true
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.loading = false
        state.customers = action.payload.data
        state.total = action.payload.total
      })
      .addCase(getCustomers.rejected, (state) => {
        state.loading = false
      })

      // getCustomerById
      .addCase(getCustomerById.pending, (state) => {
        state.loading = true
      })
      .addCase(getCustomerById.fulfilled, (state, action) => {
        state.loading = false
        state.customer = action.payload
      })
      .addCase(getCustomerById.rejected, (state) => {
        state.loading = false
      })

      // deleteCustomer
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        // On enlève localement (si la liste est chargée)
        state.customers = state.customers.filter(
          (c: any) => c?.documentId !== action.payload && c?.id !== action.payload
        )
      })
  },
})

export const { setCustomer, clearCustomers } = customersSlice.actions

export const useAppSelector = (state: any) => state

export default customersSlice.reducer