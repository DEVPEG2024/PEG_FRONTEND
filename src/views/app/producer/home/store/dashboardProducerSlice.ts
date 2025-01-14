import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { Producer } from '@/@types/producer';
import { apiGetDashboardProducerInformations } from '@/services/DashboardProducerService';

export const SLICE_NAME = 'dashboardProducer';

export type StateData = {
  loading: boolean;
  producer: Producer | null;
};

const initialState: StateData = {
  loading: false,
  producer: null,
};

export const getDashboardProducerInformations = createAsyncThunk(
  SLICE_NAME + '/getDashboardProducerInformations',
  async (documentId: string): Promise<{ producer: Producer }> => {
    return await unwrapData(apiGetDashboardProducerInformations(documentId));
  }
);

const dashboardProducerSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getDashboardProducerInformations.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      getDashboardProducerInformations.fulfilled,
      (state, action) => {
        state.loading = false;
        state.producer = action.payload.producer;
      }
    );
    builder.addCase(getDashboardProducerInformations.rejected, (state) => {
      state.loading = false;
    });
  },
});

export default dashboardProducerSlice.reducer;
