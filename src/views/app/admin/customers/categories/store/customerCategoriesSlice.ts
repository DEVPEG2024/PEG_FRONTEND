import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { CustomerCategory } from '@/@types/customer';
import { apiCreateCustomerCategory, apiDeleteCustomerCategory, apiGetCustomerCategories, apiUpdateCustomerCategory, CreateCustomerCategoryRequest, DeleteCustomerCategoryResponse, GetCustomerCategoriesRequest, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { AxiosResponse } from 'axios';

export const SLICE_NAME = 'customerCategories';

export type CustomerCategoriesState = {
  customerCategories: CustomerCategory[];
  total: number;
  loading: boolean;
  customerCategory?: CustomerCategory;
};

const initialState: CustomerCategoriesState = {
  customerCategories: [],
  loading: false,
  total: 0,
  customerCategory: undefined,
};

export const getCustomerCategories = createAsyncThunk(
  SLICE_NAME + '/getCustomerCategories',
  async (data: GetCustomerCategoriesRequest) : Promise<GetCustomerCategoriesResponse> => {
    const {customerCategories_connection} : {customerCategories_connection: GetCustomerCategoriesResponse} = await unwrapData(apiGetCustomerCategories(data));
    return customerCategories_connection;
  }
);

// TODO: à revoir en utilisant directement unwrapData
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

export const deleteCustomerCategory = createAsyncThunk(
  SLICE_NAME + '/deleteCustomerCategory',
  async (documentId: string): Promise<DeleteCustomerCategoryResponse> => {
    const {deleteCustomerCategory} : {deleteCustomerCategory: DeleteCustomerCategoryResponse} = await unwrapData(apiDeleteCustomerCategory(documentId));
    return deleteCustomerCategory;
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
    builder.addCase(getCustomerCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getCustomerCategories.fulfilled, (state, action) => {
      state.customerCategories = action.payload.nodes;
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
      state.total += 1
    });
    builder.addCase(createCustomerCategory.rejected, (state) => {
      state.loading = false;
    });
    // DELETE CUSTOMER CATEGORY
    builder.addCase(deleteCustomerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteCustomerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.customerCategories = state.customerCategories.filter((customerCategory: CustomerCategory) => customerCategory.documentId !== action.payload.documentId);
      state.total -= 1
    });
  },
});

export const {
  setCustomerCategory,
} = customerCategoriesSlice.actions;

export default customerCategoriesSlice.reducer;
