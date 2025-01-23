import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { unwrapData } from '@/utils/serviceHelper';
import { Color } from '@/@types/product';
import {
  apiCreateColor,
  apiDeleteColor,
  apiGetColors,
  apiUpdateColor,
  CreateColorRequest,
  DeleteColorResponse,
  GetColorsRequest,
  GetColorsResponse,
} from '@/services/ColorServices';

export const SLICE_NAME = 'colors';

export type ColorsState = {
  colors: Color[];
  total: number;
  selectedColor: Color | null;
  newColorDialog: boolean;
  editColorDialog: boolean;
  loading: boolean;
};

export const getColors = createAsyncThunk(
  SLICE_NAME + '/getColors',
  async (data: GetColorsRequest): Promise<GetColorsResponse> => {
    const { colors_connection }: { colors_connection: GetColorsResponse } =
      await unwrapData(apiGetColors(data));
    return colors_connection;
  }
);

export const createColor = createAsyncThunk(
  SLICE_NAME + '/createColor',
  async (data: CreateColorRequest): Promise<Color> => {
    const { createColor }: { createColor: Color } = await unwrapData(
      apiCreateColor(data)
    );
    return createColor;
  }
);

export const deleteColor = createAsyncThunk(
  SLICE_NAME + '/deleteColor',
  async (documentId: string): Promise<DeleteColorResponse> => {
    const { deleteColor }: { deleteColor: DeleteColorResponse } = await unwrapData(
      apiDeleteColor(documentId)
    );
    return deleteColor;
  }
);

export const updateColor = createAsyncThunk(
  SLICE_NAME + '/updateColor',
  async (data: Partial<Color>): Promise<Color> => {
    const { updateColor }: { updateColor: Color } = await unwrapData(
      apiUpdateColor(data)
    );
    return updateColor;
  }
);

const initialState: ColorsState = {
  colors: [],
  selectedColor: null,
  newColorDialog: false,
  editColorDialog: false,
  loading: false,
  total: 0,
};

const colorSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewColorDialog: (state, action) => {
      state.newColorDialog = action.payload;
    },
    setEditColorDialog: (state, action) => {
      state.editColorDialog = action.payload;
    },
    setSelectedColor: (state, action) => {
      state.selectedColor = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET SIZES
    builder.addCase(getColors.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getColors.fulfilled, (state, action) => {
      state.loading = false;
      state.colors = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getColors.rejected, (state) => {
      state.loading = false;
    });
    // CREATE SIZE
    builder.addCase(createColor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createColor.fulfilled, (state, action) => {
      state.loading = false;
      state.colors.push(action.payload);
      state.total += 1;
    });
    builder.addCase(createColor.rejected, (state) => {
      state.loading = false;
    });
    // UPDATE SIZE
    builder.addCase(updateColor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateColor.fulfilled, (state, action) => {
      state.loading = false;
      state.colors = state.colors.map((color) =>
        color.documentId === action.payload.documentId ? action.payload : color
      );
    });
    builder.addCase(updateColor.rejected, (state) => {
      state.loading = false;
    });
    // DELETE SIZE
    builder.addCase(deleteColor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteColor.fulfilled, (state, action) => {
      state.loading = false;
      state.colors = state.colors.filter(
        (color) => color.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });
    builder.addCase(deleteColor.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setNewColorDialog, setEditColorDialog, setSelectedColor } =
  colorSlice.actions;

export default colorSlice.reducer;
