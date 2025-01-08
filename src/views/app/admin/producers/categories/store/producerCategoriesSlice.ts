import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import { apiCreateProducerCategory, apiDeleteProducerCategory, apiGetProducerCategories, apiUpdateProducerCategory, CreateProducerCategoryRequest, DeleteProducerCategoryResponse, GetProducerCategoriesRequest, GetProducerCategoriesResponse } from '@/services/ProducerCategoryServices';
import { AxiosResponse } from 'axios';
import { ProducerCategory } from '@/@types/producer';

export const SLICE_NAME = 'producerCategories';

export type ProducerCategoriesState = {
  producerCategories: ProducerCategory[];
  total: number;
  loading: boolean;
  producerCategory?: ProducerCategory;
};

const initialState: ProducerCategoriesState = {
  producerCategories: [],
  loading: false,
  total: 0,
  producerCategory: undefined,
};

export const getProducerCategories = createAsyncThunk(
  SLICE_NAME + '/getProducerCategories',
  async (data: GetProducerCategoriesRequest) : Promise<GetProducerCategoriesResponse> => {
    const {producerCategories_connection} : {producerCategories_connection: GetProducerCategoriesResponse} = await unwrapData(apiGetProducerCategories(data));
    return producerCategories_connection;
  }
);

// TODO: à revoir en utilisant directement unwrapData
export const createProducerCategory = createAsyncThunk(
  SLICE_NAME + '/createProducerCategory',
  async (data: CreateProducerCategoryRequest) : Promise<ApiResponse<{createProducerCategory: ProducerCategory}>> => {
    const response: AxiosResponse<ApiResponse<{createProducerCategory: ProducerCategory}>> = await apiCreateProducerCategory(data);
    return response.data;
  }
);

export const updateProducerCategory = createAsyncThunk(
  SLICE_NAME + '/updateProducerCategory',
  async (data: Partial<ProducerCategory>): Promise<ApiResponse<{updateProducerCategory: ProducerCategory}>> => {
    const response: AxiosResponse<ApiResponse<{updateProducerCategory: ProducerCategory}>> = await apiUpdateProducerCategory(data);
    return response.data;
  }
);

export const deleteProducerCategory = createAsyncThunk(
  SLICE_NAME + '/deleteProducerCategory',
  async (documentId: string): Promise<DeleteProducerCategoryResponse> => {
    const {deleteProducerCategory} : {deleteProducerCategory: DeleteProducerCategoryResponse} = await unwrapData(apiDeleteProducerCategory(documentId));
    return deleteProducerCategory;
  }
);

const producerCategoriesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProducerCategory(state, action: PayloadAction<ProducerCategory | undefined>) {
      state.producerCategory = action.payload
  },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducerCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducerCategories.fulfilled, (state, action) => {
      state.producerCategories = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // UPDATE PRODUCER CATEGORY
    builder.addCase(updateProducerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProducerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.producerCategories = state.producerCategories.map((producerCategory: ProducerCategory) =>
        producerCategory.documentId === action.payload.data.updateProducerCategory.documentId
          ? action.payload.data.updateProducerCategory
          : producerCategory
      );
    });
    builder.addCase(updateProducerCategory.rejected, (state) => {
      state.loading = false;
    });
    // CREATE PRODUCER CATEGORY
    builder.addCase(createProducerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createProducerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.producerCategories.push(action.payload.data.createProducerCategory);
      state.total += 1
    });
    builder.addCase(createProducerCategory.rejected, (state) => {
      state.loading = false;
    });
    // DELETE PRODUCER CATEGORY
    builder.addCase(deleteProducerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProducerCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.producerCategories = state.producerCategories.filter((producerCategory: ProducerCategory) => producerCategory.documentId !== action.payload.documentId);
      state.total -= 1
    });
  },
});

export const {
  setProducerCategory: setProducerCategory,
} = producerCategoriesSlice.actions;

export default producerCategoriesSlice.reducer;
