import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  apiGetCustomers,
  apiCreateCustomer,
  apiUpdateCustomerByDocumentId,
  apiDeleteCustomerByDocumentId,
  apiGetCustomerForEditByDocumentId,
  apiUploadFile,
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

export const getCustomers = createAsyncThunk(
  'customers/getCustomers',
  async (params: GetCustomersRequest) => {
    const res: any = await apiGetCustomers(params)

    // Strapi v4: res.data.data (array) + res.data.meta.pagination.total
    const data = res?.data?.data ?? []
    const total = res?.data?.meta?.pagination?.total ?? (Array.isArray(data) ? data.length : 0)

    return { data: Array.isArray(data) ? data : [], total }
  }
)

export const getCustomerForEditById = createAsyncThunk(
  'customers/getCustomerForEditById',
  async (documentId: string) => {
    const res: any = await apiGetCustomerForEditByDocumentId(documentId)
    const arr = res?.data?.data ?? []
    const first = Array.isArray(arr) ? arr[0] : null
    return first ?? null
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (documentId: string) => {
    await apiDeleteCustomerByDocumentId(documentId)
    return documentId
  }
)

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async ({ data, logoFile }: { data: any; logoFile?: File | null }) => {
    let payload = { ...data }

    if (logoFile) {
      const uploadRes: any = await apiUploadFile(logoFile)
      const uploaded = uploadRes?.data?.[0]
      // Strapi upload renvoie souvent [{ id, ... }]
      if (uploaded?.id) payload.logo = uploaded.id
    }

    const res: any = await apiCreateCustomer(payload)
    return res?.data?.data ?? null
  }
)

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data, logoFile }: { id: string; data: any; logoFile?: File | null }) => {
    let payload = { ...data }

    if (logoFile) {
      const uploadRes: any = await apiUploadFile(logoFile)
      const uploaded = uploadRes?.data?.[0]
      if (uploaded?.id) payload.logo = uploaded.id
    }

    // id ici = documentId dans ton routing (/edit/:id)
    const res: any = await apiUpdateCustomerByDocumentId(id, payload)
    return res?.data?.data ?? null
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
      .addCase(getCustomerForEditById.pending, (state) => {
        state.loading = true
      })
      .addCase(getCustomerForEditById.fulfilled, (state, action) => {
        state.loading = false
        state.customer = action.payload
      })
      .addCase(getCustomerForEditById.rejected, (state) => {
        state.loading = false
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.customers = state.customers.filter(
          (c: any) => c?.documentId !== action.payload
        )
        state.total = Math.max(0, state.total - 1)
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        if (action.payload) {
          state.customers = [action.payload as any, ...state.customers]
          state.total += 1
        }
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const updated: any = action.payload
        if (!updated?.documentId) return
        state.customers = state.customers.map((c: any) =>
          c?.documentId === updated.documentId ? updated : c
        )
        state.customer = updated
      })
  },
})

export const { setCustomer, clearCustomers } = customersSlice.actions
export default customersSlice.reducer