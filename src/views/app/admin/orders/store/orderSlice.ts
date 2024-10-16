import { createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import { WritableDraft } from 'immer'
import { apiGetOrders, apiUpdateStatusOrder } from '@/services/OrderServices'
import { IOrder } from '@/@types/order'

export const SLICE_NAME = 'orders'

export type OrderState = {
    orders: IOrder[]
    loading: boolean
    total: number
}

type GetOrderListRequest = {
    page: number,
    pageSize: number,
    searchTerm: string 
}

export const getOrders = createAsyncThunk(
    SLICE_NAME + '/getOrders',
    async (data: GetOrderListRequest) => {
        const response = await apiGetOrders(data.page, data.pageSize, data.searchTerm);
        return response.data
    }
)

type UpdateStatusOrderFinishedRequest = {
    order: IOrder
    status: string
}

export const finishOrder = createAsyncThunk(
    SLICE_NAME + '/updateStatusOrder',
    async (data: UpdateStatusOrderFinishedRequest) => {
        await apiUpdateStatusOrder(data);   
        return {status: data.status, order: data.order};
    }
)

const initialState: OrderState = {
    orders: [],
    loading: false,
    total: 0
}

const orderSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        // GET ORDERS
        builder.addCase(getOrders.pending, (state) => {
            state.loading = true
        })
        builder.addCase(getOrders.fulfilled, (state, action) => {
            state.loading = false
            state.orders = action.payload.orders as unknown as WritableDraft<IOrder>[]
            state.total = action.payload.total
        })
        builder.addCase(getOrders.rejected, (state) => {
            state.loading = false
        })
        builder.addCase(finishOrder.pending, (state) => {
            state.loading = true
        })
        builder.addCase(finishOrder.fulfilled, (state, action) => {
            state.loading = false
            state.orders = state.orders.map((order) => {
                if (order._id === action.payload.order._id) {
                    return action.payload.order
                }   
                return order
            })
        })
        builder.addCase(finishOrder.rejected, (state) => {
            state.loading = false
        })
    }
})

export default orderSlice.reducer;
