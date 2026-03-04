import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
    apiGetCustomers,
    apiDeleteCustomer,
    apiGetCustomerForEditById,
} from '@/services/CustomerServices'
import type { Customer } from '@/@types/customer'

export const getCustomers = createAsyncThunk(
    'customers/getCustomers',
    async (params: any) => {
        const response = await apiGetCustomers(params)
        return response.data
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
        const response = await apiGetCustomerForEditById(id)
        return response.data
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
    },
    extraReducers: (builder) => {
        builder
            .addCase(getCustomers.pending, (state) => {
                state.data.loading = true
            })
            .addCase(getCustomers.fulfilled, (state, action) => {
                state.data.loading = false
                state.data.customers = action.payload.data || []
                state.data.total = action.payload.meta?.pagination?.total || 0
            })
            .addCase(deleteCustomer.fulfilled, (state, action) => {
                state.data.customers = state.data.customers.filter(
                    (c) => c.documentId !== action.payload
                )
            })
            .addCase(getCustomerForEditById.fulfilled, (state, action) => {
                state.selectedCustomer = action.payload
            })
    },
})

export const { setCustomer } = customersSlice.actions

export const useAppSelector = (state: any) => state.customers

export default customersSlice.reducer