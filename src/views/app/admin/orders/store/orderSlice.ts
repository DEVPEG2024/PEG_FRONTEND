import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import {
  apiGetOrderById,
  apiGetOrders,
  apiUpdatePaymentStatusOrder,
  apiUpdateStatusOrder,
} from '@/services/OrderServices';
import { IOrder, OrderItem } from '@/@types/order';
import { AppDispatch, injectReducer } from '@/store';
import showOrderReducer, {
  setFormAnswer,
  setSizesSelected,
  setProduct,
} from '../../../common/order/show/store';

injectReducer('showOrder', showOrderReducer);

export const SLICE_NAME = 'orders';

export type OrderState = {
  orders: IOrder[];
  loading: boolean;
  total: number;
};

type GetOrderListRequest = {
  page: number;
  pageSize: number;
  searchTerm: string;
};

export const getOrders = createAsyncThunk(
  SLICE_NAME + '/getOrders',
  async (data: GetOrderListRequest) => {
    const response = await apiGetOrders(
      data.page,
      data.pageSize,
      data.searchTerm
    );
    return response.data;
  }
);

type GetOrder = {
  orderId: string;
};

export const getOrder = createAsyncThunk(
  SLICE_NAME + '/getOrder',
  async (data: GetOrder) => {
    const response = await apiGetOrderById(data.orderId);
    return response.data;
  }
);

type UpdateStatusOrderFinishedRequest = {
  order: IOrder;
};

export const finishOrder = createAsyncThunk(
  SLICE_NAME + '/updateStatusOrder',
  async (data: UpdateStatusOrderFinishedRequest) => {
    await apiUpdateStatusOrder({ orderId: data.order._id, status: 'FINISHED' });
  }
);

export const pendOrder = createAsyncThunk(
  SLICE_NAME + '/updateStatusOrder',
  async (data: UpdateStatusOrderFinishedRequest) => {
    await apiUpdateStatusOrder({ orderId: data.order._id, status: 'PENDING' });
  }
);

type UpdatePaymentStatusOrderRequest = {
  order: IOrder;
};

export const validatePayment = createAsyncThunk(
  SLICE_NAME + '/updatePaymentStatusOrder',
  async (data: UpdatePaymentStatusOrderRequest) => {
    await apiUpdatePaymentStatusOrder({
      orderId: data.order._id,
      status: 'RECEIVED',
    });
  }
);

export const invalidatePayment = createAsyncThunk(
  SLICE_NAME + '/updatePaymentStatusOrder',
  async (data: UpdatePaymentStatusOrderRequest) => {
    await apiUpdatePaymentStatusOrder({
      orderId: data.order._id,
      status: 'PENDING',
    });
  }
);

export const showOrder = (orderItem: OrderItem) => (dispatch: AppDispatch) => {
  dispatch(setFormAnswer(orderItem.formAnswer));
  dispatch(setProduct(orderItem.product));
  dispatch(setSizesSelected(orderItem.sizeSelections));
};

const initialState: OrderState = {
  orders: [],
  loading: false,
  total: 0,
};

const orderSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // GET ORDERS
    builder.addCase(getOrders.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getOrders.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = action.payload
        .orders as unknown as WritableDraft<IOrder>[];
      state.total = action.payload.total;
    });
    builder.addCase(getOrders.rejected, (state) => {
      state.loading = false;
    });
    // GET ORDER
    builder.addCase(getOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = state.orders.map((order) =>
        order._id === action.payload.order._id ? action.payload.order : order
      );
    });
    builder.addCase(getOrder.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default orderSlice.reducer;
