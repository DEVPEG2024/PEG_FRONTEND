import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { Customer, CustomerCategory } from '@/@types/customer';
import { apiCreateCustomerCategory, apiDeleteCustomerCategory, apiUpdateCustomerCategory, CreateCustomerCategoryRequest, DeleteCustomerCategoryResponse, GetCustomerCategoriesRequest, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { AxiosResponse } from 'axios';
import { apiDeleteCustomer, apiGetCustomers, DeleteCustomerResponse, GetCustomersRequest, GetCustomersResponse } from '@/services/CustomerServices';

export const SLICE_NAME = 'customers';

export type CustomersState = {
  customers: Customer[];
  total: number;
  loading: boolean;
  customer?: Customer,
};

const initialState: CustomersState = {
  customers: [],
  loading: false,
  total: 0,
  customer: undefined,
};

export const getCustomers = createAsyncThunk(
  SLICE_NAME + '/getCustomers',
  async (data: GetCustomersRequest) : Promise<GetCustomersResponse> => {
    const {customers_connection} : {customers_connection: GetCustomersResponse} = await unwrapData(apiGetCustomers(data));
    return customers_connection;
  }
);

export const createCustomerCategory = createAsyncThunk(
  SLICE_NAME + '/createCustomerCategory',
  async (data: CreateCustomerCategoryRequest) : Promise<ApiResponse<{createCustomerCategory: CustomerCategory}>> => {
    const response: AxiosResponse<ApiResponse<{createCustomerCategory: CustomerCategory}>> = await apiCreateCustomerCategory(data);
    return response.data;
  }
);

export const updateCustomerCategory = createAsyncThunk(
  SLICE_NAME + '/updateCustomerCategory',
  async (data: Partial<CustomerCategory>): Promise<ApiResponse<{updateCustomerCategory: CustomerCategory}>> => {
    const response: AxiosResponse<ApiResponse<{updateCustomerCategory: CustomerCategory}>> = await apiUpdateCustomerCategory(data);
    return response.data;
  }
);

export const deleteCustomer = createAsyncThunk(
  SLICE_NAME + '/deleteCustomer',
  async (documentId: string): Promise<DeleteCustomerResponse> => {
    const {deleteCustomer} : {deleteCustomer: DeleteCustomerResponse} = await unwrapData(apiDeleteCustomer(documentId));
    return deleteCustomer;
  }
);

const customerCategoriesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setCustomerCategory(state, action: PayloadAction<CustomerCategory | undefined>) {
      state.customerCategory = action.payload
  },
  },
  extraReducers: (builder) => {
    builder.addCase(getCustomers.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCustomers.fulfilled, (state, action) => {
      state.customers = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // UPDATE CUSTOMER CATEGORY
    builder.addCase(updateCustomerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateCustomerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.customerCategories = state.customerCategories.map((customerCategory: CustomerCategory) =>
        customerCategory.documentId === action.payload.data.updateCustomerCategory.documentId
          ? action.payload.data.updateCustomerCategory
          : customerCategory
      );
    });
    builder.addCase(updateCustomerCategory.rejected, (state) => {
      state.loading = false;
    });
    // CREATE CUSTOMER CATEGORY
    builder.addCase(createCustomerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createCustomerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.customerCategories.push(action.payload.data.createCustomerCategory);
      state.total = state.customerCategories.length
    });
    builder.addCase(createCustomerCategory.rejected, (state) => {
      state.loading = false;
    });
    // DELETE CUSTOMER
    builder.addCase(deleteCustomer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteCustomer.fulfilled, (state, action) => {
      state.loading = false;
      state.customers = state.customers.filter((customer: Customer) => customer.documentId !== action.payload.documentId);
      state.total = state.customers.length
    });
  },
});

export const {
  setCustomerCategory,
} = customerCategoriesSlice.actions;

export default customerCategoriesSlice.reducer;
