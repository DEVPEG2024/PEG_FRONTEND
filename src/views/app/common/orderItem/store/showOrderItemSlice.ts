import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product, SizeSelection } from '@/@types/product';
import { FormAnswer } from '@/@types/formAnswer';
import { OrderItem } from '@/@types/orderItem';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetOrderItemById } from '@/services/OrderItemServices';

export const SLICE_NAME = 'showOrderItem';

export type StateData = {
  loading: boolean;
  orderItem: OrderItem | null;
  orderItemFormDialog: boolean;
};

const initialState: StateData = {
  loading: false,
  orderItem: null,
  orderItemFormDialog: false,
};

export const getOrderItemById = createAsyncThunk(
  SLICE_NAME + '/getOrderItemById',
  async (documentId: string): Promise<{orderItem: OrderItem}> => {
    return await unwrapData(apiGetOrderItemById(documentId));
  }
);

const showOrderItemSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setOrderItemFormDialog: (state, action) => {
      state.orderItemFormDialog = action.payload;
    },
    clearOrderItemState: (state) => {
      state.orderItemFormDialog = false;
      state.orderItem = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getOrderItemById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getOrderItemById.fulfilled, (state, action) => {
      state.orderItem = action.payload.orderItem;
      state.loading = false;
    });
  },
});

export const {
  clearOrderItemState,
  setOrderItemFormDialog
} = showOrderItemSlice.actions;

export default showOrderItemSlice.reducer;
