import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import {
  apiCreateProducerCategory,
  apiDeleteProducerCategory,
  apiGetProducerCategories,
  apiUpdateProducerCategory,
  CreateProducerCategoryRequest,
  DeleteProducerCategoryResponse,
  GetProducerCategoriesRequest,
  GetProducerCategoriesResponse,
} from '@/services/ProducerCategoryServices';
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
  async (
    data: GetProducerCategoriesRequest
  ): Promise<GetProducerCategoriesResponse> => {
    const {
      producerCategories_connection,
    }: { producerCategories_connection: GetProducerCategoriesResponse } =
      await unwrapData(apiGetProducerCategories(data));
    return producerCategories_connection;
  }
);

// TODO: à revoir en utilisant directement unwrapData
export const createProducerCategory = createAsyncThunk(
  SLICE_NAME + '/createProducerCategory',
  async (
    data: CreateProducerCategoryRequest
  ): Promise<ApiResponse<{ createProducerCategory: ProducerCategory }>> => {
    const response: AxiosResponse<
      ApiResponse<{ createProducerCategory: ProducerCategory }>
    > = await apiCreateProducerCategory(data);
    return response.data;
  }
);

export const updateProducerCategory = createAsyncThunk(
  SLICE_NAME + '/updateProducerCategory',
  async (
    data: Partial<ProducerCategory>
  ): Promise<ApiResponse<{ updateProducerCategory: ProducerCategory }>> => {
    const response: AxiosResponse<
      ApiResponse<{ updateProducerCategory: ProducerCategory }>
    > = await apiUpdateProducerCategory(data);
    return response.data;
  }
);

export const deleteProducerCategory = createAsyncThunk(
  SLICE_NAME + '/deleteProducerCategory',
  async (documentId: string): Promise<DeleteProducerCategoryResponse> => {
    const {
      deleteProducerCategory,
    }: { deleteProducerCategory: DeleteProducerCategoryResponse } =
      await unwrapData(apiDeleteProducerCategory(documentId));
    return deleteProducerCategory;
  }
);

const producerCategoriesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProducerCategory(
      state,
      action: PayloadAction<ProducerCategory | undefined>
    ) {
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.producerCategory = action.payload as any;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducerCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducerCategories.fulfilled, (state, action) => {
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.producerCategories = action.payload.nodes as any;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // UPDATE PRODUCER CATEGORY
    builder.addCase(updateProducerCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProducerCategory.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.producerCategories = (
        state.producerCategories as unknown as ProducerCategory[]
      ).map((producerCategory: ProducerCategory) =>
        producerCategory.documentId ===
        action.payload.data.updateProducerCategory.documentId
          ? action.payload.data.updateProducerCategory
          : producerCategory
      ) as any;
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.producerCategories.push(
        action.payload.data.createProducerCategory as any
      );
      state.total += 1;
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.producerCategories = (
        state.producerCategories as unknown as ProducerCategory[]
      ).filter(
        (producerCategory: ProducerCategory) =>
          producerCategory.documentId !== action.payload.documentId
      ) as any;
      state.total -= 1;
    });
  },
});

export const { setProducerCategory: setProducerCategory } =
  producerCategoriesSlice.actions;

export default producerCategoriesSlice.reducer;
