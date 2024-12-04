import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import {
  apiGetOrderById,
  apiGetOrderItems,
  apiGetOrders,
  apiUpdateOrderItem,
  apiUpdatePaymentStatusOrder,
  apiUpdateStatusOrder,
  GetOrderItemsRequest,
  GetOrderItemsResponse,
} from '@/services/OrderServices';
import { IOrder, OrderItem } from '@/@types/order';
import { AppDispatch, injectReducer } from '@/store';
import showOrderReducer, {
  setFormAnswer,
  setSizesSelected,
  setProduct,
} from '../../../common/order/show/store';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';

injectReducer('showOrder', showOrderReducer);

export const SLICE_NAME = 'orders';

export type OrderState = {
  orderItems: OrderItem[];
  loading: boolean;
  total: number;
};

const initialState: OrderState = {
  orderItems: [],
  loading: false,
  total: 0,
};

export const getOrderItems = createAsyncThunk(
  SLICE_NAME + '/getOrderItems',
  async (data: GetOrderItemsRequest): Promise<GetOrderItemsResponse> => {
    const {orderItems_connection} : {orderItems_connection: GetOrderItemsResponse}= await unwrapData(apiGetOrderItems(data));
    return orderItems_connection
  }
);

export const updateOrderItem = createAsyncThunk(
  SLICE_NAME + '/updateOrderItem',
  async (data: Partial<OrderItem>): Promise<ApiResponse<{updateOrderItem: OrderItem}>> => {
    const response: AxiosResponse<ApiResponse<{updateOrderItem: OrderItem}>> = await apiUpdateOrderItem(data);
    return response.data;
  }
);

/*type GetOrder = {
  orderId: string;
};

export const getOrder = createAsyncThunk(
  SLICE_NAME + '/getOrder',
  async (data: GetOrder) => {
    const response = await apiGetOrderById(data.orderId);
    return response.data;
  }
);*/

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

const orderSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // GET ORDERS
    builder.addCase(getOrderItems.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getOrderItems.fulfilled, (state, action) => {
      state.loading = false;
      state.orderItems = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getOrderItems.rejected, (state) => {
      state.loading = false;
    });
    // GET ORDER
    builder.addCase(updateOrderItem.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateOrderItem.fulfilled, (state, action) => {
      state.loading = false;
      state.orderItems = state.orderItems.map((orderItem) =>
        orderItem.documentId === action.payload.data.updateOrderItem.documentId ? action.payload.data.updateOrderItem : orderItem
      );
    });
    builder.addCase(updateOrderItem.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default orderSlice.reducer;
