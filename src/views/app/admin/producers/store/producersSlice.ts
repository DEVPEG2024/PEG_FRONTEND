import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { unwrapData } from '@/utils/serviceHelper';
import { Producer } from '@/@types/producer';
import { apiDeleteProducer, apiGetProducerForEditById, apiGetProducers, DeleteProducerResponse, GetProducersRequest, GetProducersResponse } from '@/services/ProducerServices';

export const SLICE_NAME = 'producers';

export type ProducersState = {
  producers: Producer[];
  total: number;
  loading: boolean;
  producer?: Producer,
};

const initialState: ProducersState = {
  producers: [],
  loading: false,
  total: 0,
  producer: undefined,
};

export const getProducers = createAsyncThunk(
  SLICE_NAME + '/getProducers',
  async (data: GetProducersRequest) : Promise<GetProducersResponse> => {
    const {producers_connection} : {producers_connection: GetProducersResponse} = await unwrapData(apiGetProducers(data));
    return producers_connection;
  }
);

export const getProducerById = createAsyncThunk(
  SLICE_NAME + '/getProducerById',
  async (documentId: string): Promise<{producer: Producer}> => {
    return await unwrapData(apiGetProducerForEditById(documentId));
  }
);

export const deleteProducer = createAsyncThunk(
  SLICE_NAME + '/deleteProducer',
  async (documentId: string): Promise<DeleteProducerResponse> => {
    const {deleteProducer} : {deleteProducer: DeleteProducerResponse} = await unwrapData(apiDeleteProducer(documentId));
    return deleteProducer;
  }
);

const producersSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setProducer: (state, action) => {
      state.producer = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducers.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducers.fulfilled, (state, action) => {
      state.producers = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
    });
    // DELETE PRODUCER
    builder.addCase(deleteProducer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProducer.fulfilled, (state, action) => {
      state.loading = false;
      state.producers = state.producers.filter((producer: Producer) => producer.documentId !== action.payload.documentId);
      state.total -= 1
    });
    
    builder.addCase(getProducerById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducerById.fulfilled, (state, action) => {
      state.loading = false;
      state.producer = action.payload.producer;
    });
    builder.addCase(getProducerById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setProducer,
} = producersSlice.actions;

export default producersSlice.reducer;
