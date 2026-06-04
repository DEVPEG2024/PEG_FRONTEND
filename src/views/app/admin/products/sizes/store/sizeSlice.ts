import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { unwrapData } from '@/utils/serviceHelper';
import { Size } from '@/@types/product';
import {
  apiCreateSize,
  apiDeleteSize,
  apiGetSizes,
  apiUpdateSize,
  CreateSizeRequest,
  DeleteSizeResponse,
  GetSizesRequest,
  GetSizesResponse,
  UpdateSizeRequest,
} from '@/services/SizeServices';

export const SLICE_NAME = 'sizes';

export type SizesState = {
  sizes: Size[];
  total: number;
  selectedSize: Size | null;
  newSizeDialog: boolean;
  editSizeDialog: boolean;
  loading: boolean;
};

export const getSizes = createAsyncThunk(
  SLICE_NAME + '/getSizes',
  async (data: GetSizesRequest): Promise<GetSizesResponse> => {
    const { sizes_connection }: { sizes_connection: GetSizesResponse } =
      await unwrapData(apiGetSizes(data));
    return sizes_connection;
  }
);

export const createSize = createAsyncThunk(
  SLICE_NAME + '/createSize',
  async (data: CreateSizeRequest): Promise<Size> => {
    const { createSize }: { createSize: Size } = await unwrapData(
      apiCreateSize(data)
    );
    return createSize;
  }
);

export const deleteSize = createAsyncThunk(
  SLICE_NAME + '/deleteSize',
  async (documentId: string): Promise<DeleteSizeResponse> => {
    const { deleteSize }: { deleteSize: DeleteSizeResponse } = await unwrapData(
      apiDeleteSize(documentId)
    );
    return deleteSize;
  }
);

export const updateSize = createAsyncThunk(
  SLICE_NAME + '/updateSize',
  async (data: UpdateSizeRequest): Promise<Size> => {
    const { updateSize }: { updateSize: Size } = await unwrapData(
      apiUpdateSize(data)
    );
    return updateSize;
  }
);

const initialState: SizesState = {
  sizes: [],
  selectedSize: null,
  newSizeDialog: false,
  editSizeDialog: false,
  loading: false,
  total: 0,
};

const sizeSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewSizeDialog: (state, action) => {
      state.newSizeDialog = action.payload;
    },
    setEditSizeDialog: (state, action) => {
      state.editSizeDialog = action.payload;
    },
    setSelectedSize: (state, action) => {
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.selectedSize = action.payload as any;
    },
  },
  extraReducers: (builder) => {
    // GET SIZES
    builder.addCase(getSizes.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getSizes.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.sizes = action.payload.nodes as any;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getSizes.rejected, (state) => {
      state.loading = false;
    });
    // CREATE SIZE
    builder.addCase(createSize.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createSize.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.sizes.push(action.payload as any);
      state.total += 1;
    });
    builder.addCase(createSize.rejected, (state) => {
      state.loading = false;
    });
    // UPDATE SIZE
    builder.addCase(updateSize.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateSize.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.sizes = (state.sizes as unknown as Size[]).map((size) =>
        size.documentId === action.payload.documentId ? action.payload : size
      ) as any;
    });
    builder.addCase(updateSize.rejected, (state) => {
      state.loading = false;
    });
    // DELETE SIZE
    builder.addCase(deleteSize.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteSize.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.sizes = (state.sizes as unknown as Size[]).filter(
        (size) => size.documentId !== action.payload.documentId
      ) as any;
      state.total -= 1;
    });
    builder.addCase(deleteSize.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setNewSizeDialog, setEditSizeDialog, setSelectedSize } =
  sizeSlice.actions;

export default sizeSlice.reducer;
