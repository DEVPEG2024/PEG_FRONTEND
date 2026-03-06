import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  apiDeleteOrderItem,
  apiGetOrderItems,
  apiUpdateOrderItem,
  DeleteOrderItemResponse,
  GetOrderItemsRequest,
  GetOrderItemsResponse,
} from '@/services/OrderItemServices';
import { OrderItem } from '@/@types/orderItem';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';

export const SLICE_NAME = 'orders';

export type OrderState = {
  orderItems: OrderItem[];
  loading: boolean;
  total: number;
  pageCount: number;
  counts: { pending: number; fulfilled: number };
};

const initialState: OrderState = {
  orderItems: [],
  loading: false,
  total: 0,
  pageCount: 1,
  counts: { pending: 0, fulfilled: 0 },
};

export const getOrderItems = createAsyncThunk(
  SLICE_NAME + '/getOrderItems',
  async (data: GetOrderItemsRequest): Promise<GetOrderItemsResponse> => {
    const {
      orderItems_connection,
    }: { orderItems_connection: GetOrderItemsResponse } = await unwrapData(
      apiGetOrderItems(data)
    );
    return orderItems_connection;
  }
);

export const getOrderItemsCount = createAsyncThunk(
  SLICE_NAME + '/getOrderItemsCount',
  async (state: string): Promise<{ state: string; count: number }> => {
    const { orderItems_connection }: { orderItems_connection: GetOrderItemsResponse } = await unwrapData(
      apiGetOrderItems({ pagination: { page: 1, pageSize: 1 }, searchTerm: '', state })
    );
    return { state, count: orderItems_connection.pageInfo.total };
  }
);

export const updateOrderItem = createAsyncThunk(
  SLICE_NAME + '/updateOrderItem',
  async (
    data: Partial<OrderItem>
  ): Promise<ApiResponse<{ updateOrderItem: OrderItem }>> => {
    const response: AxiosResponse<ApiResponse<{ updateOrderItem: OrderItem }>> =
      await apiUpdateOrderItem(data);
    return response.data;
  }
);

export const deleteOrderItem = createAsyncThunk(
  SLICE_NAME + '/deleteOrderItem',
  async (documentId: string): Promise<DeleteOrderItemResponse> => {
    const { deleteOrderItem }: { deleteOrderItem: DeleteOrderItemResponse } =
      await unwrapData(apiDeleteOrderItem(documentId));
    return deleteOrderItem;
  }
);

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
      state.pageCount = action.payload.pageInfo.pageCount;
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
        orderItem.documentId === action.payload.data.updateOrderItem.documentId
          ? action.payload.data.updateOrderItem
          : orderItem
      );
    });
    builder.addCase(updateOrderItem.rejected, (state) => {
      state.loading = false;
    });

    // DELETE ORDER ITEM
    builder.addCase(deleteOrderItem.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteOrderItem.fulfilled, (state, action) => {
      state.loading = false;
      state.orderItems = state.orderItems.filter(
        (orderItem) => orderItem.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });
    builder.addCase(deleteOrderItem.rejected, (state) => {
      state.loading = false;
    });

    // COUNTS
    builder.addCase(getOrderItemsCount.fulfilled, (state, action) => {
      state.counts[action.payload.state as 'pending' | 'fulfilled'] = action.payload.count;
    });
  },
});

export default orderSlice.reducer;
