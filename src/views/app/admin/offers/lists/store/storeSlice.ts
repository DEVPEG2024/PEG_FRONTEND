import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IOffer } from '@/@types/offer';
import {
  apiGetOffers,
  apiPutStatusOffer,
  apiDeleteOffer,
  apiUpdateOffer,
} from '@/services/OfferServices';

type Offers = IOffer[];

export type StateData = {
  loading: boolean;
  offers: Offers;
  offer: IOffer | null;
  modalDelete: boolean;
  total: number;
  result: boolean;
  message: string;
};

type Query = {
  page: number;
  pageSize: number;
  searchTerm: string;
};

type GetProductListRequest = Query;
export const SLICE_NAME = 'offers';

// get offers
export const getOffers = createAsyncThunk(
  SLICE_NAME + '/getOffers',
  async (data: GetProductListRequest) => {
    const response = await apiGetOffers(
      data.page,
      data.pageSize,
      data.searchTerm
    );
    return response.data;
  }
);

type PutStatusProductRequest = {
  id: string;
};

export const putStatusOffer = createAsyncThunk(
  SLICE_NAME + '/putStatusOffer',
  async (data: PutStatusProductRequest) => {
    const response = await apiPutStatusOffer(data.id);
    return response.data;
  }
);

type UpdateOfferRequest = {
  offer: IOffer;
};

export const updateOffer = createAsyncThunk(
  SLICE_NAME + '/updateOffer',
  async (data: UpdateOfferRequest) => {
    const response = await apiUpdateOffer(data.offer);
    return response.data;
  }
);

export const deleteOffer = createAsyncThunk(
  SLICE_NAME + '/deleteOffer',
  async (data: PutStatusProductRequest) => {
    const response = await apiDeleteOffer(data.id);
    return data.id;
  }
);

const initialState: StateData = {
  loading: false,
  offers: [],
  offer: null,
  modalDelete: false,
  total: 0,
  result: false,
  message: '',
};

const licencieSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setTableData: (state, action) => {
      state.offers = action.payload;
    },
    setOffer: (state, action) => {
      state.offer =
        state.offers.find((offer) => offer._id === action.payload) ?? null;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
    setEditProduct: (state, action) => {
      const offer = state.offers.find(
        (offer) => offer._id === action.payload._id
      );
      if (offer) {
        state.offer = offer;
      }
    },
    setEditingProduct: (state, action) => {
      state.offer = action.payload;
    },
    setActiveProduct: (state, action) => {
      console.log(action.payload);
      const offerId = action.payload.id;
      const isActive = action.payload.mode;

      const offer = state.offers.find((offer) => offer._id === offerId);
      if (offer) {
        offer.isAvailable = isActive;
      }
    },
    setDeleteProduct: (state, action) => {
      state.offer =
        state.offers.find((offer) => offer._id === action.payload) ?? null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getOffers.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getOffers.fulfilled, (state, action) => {
      state.loading = false;
      state.offers = action.payload.offers;
    });
    builder.addCase(getOffers.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(putStatusOffer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(putStatusOffer.fulfilled, (state, action) => {
      state.loading = false;
      state.offers = state.offers.map((offer) => {
        if (offer._id === action.payload.offer._id) {
          return action.payload.offer;
        }
        return offer;
      });
    });
    builder.addCase(putStatusOffer.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteOffer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteOffer.fulfilled, (state, action) => {
      state.loading = false;
      state.offers = state.offers.filter(
        (offer) => offer._id !== action.payload
      );
    });
    builder.addCase(deleteOffer.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(updateOffer.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateOffer.fulfilled, (state, action) => {
      state.loading = false;
      state.offers = state.offers.map((offer) => {
        if (offer._id === action.payload.offer._id) {
          return action.payload.offer;
        }
        return offer;
      });
    });
    builder.addCase(updateOffer.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setTableData,
  setOffer,
  setModalDeleteOpen,
  setModalDeleteClose,
  setDeleteProduct,
  setActiveProduct,
  setEditingProduct,
} = licencieSlice.actions;

export default licencieSlice.reducer;
