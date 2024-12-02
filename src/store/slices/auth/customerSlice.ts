import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Customer } from '@/@types/customer'
import { SLICE_BASE_NAME } from './constants'

export type CustomerState = {
    customer?: Customer;
}

const initialState: CustomerState = {
    customer: undefined,
}

const customerSlice = createSlice({
    name: `${SLICE_BASE_NAME}/customer`,
    initialState,
    reducers: {
        setCustomer(state, action: PayloadAction<Customer>) {
            state.customer = action.payload
        },
    },
})

export const { setCustomer } = customerSlice.actions
export default customerSlice.reducer
