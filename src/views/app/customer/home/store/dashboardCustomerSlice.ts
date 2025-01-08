import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Customer } from '@/@types/customer';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetDashboardCustomerInformations } from '@/services/DashboardCustomerService';
import { CustomerProductsResponse, apiGetCustomerProducts } from '@/services/ProductServices';
import { Product } from '@/@types/product';

export const SLICE_NAME = 'dashboardCustomer';

export type StateData = {
  loading: boolean;
  customer: Customer | null;
  products: Product[]
};

const initialState: StateData = {
  loading: false,
  customer: null,
  products: []
};

export const getDashboardCustomerInformations = createAsyncThunk(
  SLICE_NAME + '/getDashboardCustomerInformations',
  async (documentId: string): Promise<{products: Product[], customer: Customer}> => {
    const {customer} : {customer: Customer} = await unwrapData(apiGetDashboardCustomerInformations(documentId));
    const {products_connection} : {products_connection: CustomerProductsResponse} = await unwrapData(apiGetCustomerProducts(customer?.documentId, customer.customerCategory.documentId));
    return {products: products_connection.nodes, customer}
  }
);

const dashboardCustomerSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
  },
  extraReducers: (builder) => {
    builder.addCase(getDashboardCustomerInformations.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getDashboardCustomerInformations.fulfilled, (state, action) => {
      state.loading = false;
      state.customer = action.payload.customer;
      state.products = action.payload.products;
    });
    builder.addCase(getDashboardCustomerInformations.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
} = dashboardCustomerSlice.actions;

export default dashboardCustomerSlice.reducer;
