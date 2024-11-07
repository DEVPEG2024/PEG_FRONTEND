import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import { Invoice } from '@/@types/invoice';
import {
  apiCreateInvoice,
  apiDeleteInvoice,
  apiGetInvoices,
  apiUpdateInvoice,
} from '@/services/InvoicesServices';

export type ProjectListState = {
  invoices: Invoice[];
  total: number;
  result: boolean;
  message: string;
  selectedInvoice: Invoice | null;
  newInvoiceDialog: boolean;
  editInvoiceDialog: boolean;
  loading: boolean;
};
type Query = {
  page: number;
  pageSize: number;
  searchTerm: string;
};

type GetInvoiceListRequest = Query;

export const SLICE_NAME = 'invoices';

export const getInvoices = createAsyncThunk(
  SLICE_NAME + '/getInvoices',
  async (data: GetInvoiceListRequest) => {
    const response = await apiGetInvoices(
      data.page,
      data.pageSize,
      data.searchTerm
    );
    return response.data;
  }
);

type CreateInvoiceRequest = {
  invoice: Invoice;
  sellerId: string;
};

export const createInvoice = createAsyncThunk(
  SLICE_NAME + '/createInvoice',
  async (data: CreateInvoiceRequest) => {
    const response = await apiCreateInvoice(data);
    return response.data;
  }
);

type DeleteInvoiceRequest = {
  invoiceId: string;
};

export const deleteInvoice = createAsyncThunk(
  SLICE_NAME + '/deleteInvoice',
  async (data: DeleteInvoiceRequest) => {
    const response = await apiDeleteInvoice(data);
    return response.data.invoiceId;
  }
);

type UpdateInvoiceRequest = {
  invoice: Invoice;
  invoiceId: string;
};

export const updateInvoice = createAsyncThunk(
  SLICE_NAME + '/updateInvoice',
  async (data: UpdateInvoiceRequest) => {
    const response = await apiUpdateInvoice(data);
    return { invoice: response.data.invoice, invoiceId: data.invoiceId };
  }
);

const initialState: ProjectListState = {
  invoices: [],
  selectedInvoice: null,
  newInvoiceDialog: false,
  editInvoiceDialog: false,
  loading: false,
  total: 0,
  result: false,
  message: '',
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewInvoiceDialog: (state, action) => {
      state.newInvoiceDialog = action.payload;
    },
    setEditInvoiceDialog: (state, action) => {
      state.editInvoiceDialog = action.payload;
    },
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET INVOICES
    builder.addCase(getInvoices.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getInvoices.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = action.payload
        .invoices as unknown as WritableDraft<Invoice>[];
      state.total = action.payload.total;
    });
    // CREATE INVOICE
    builder.addCase(createInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.newInvoiceDialog = false;
      state.invoices.push(action.payload.invoice as never);
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // UPDATE INVOICE
    builder.addCase(updateInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.editInvoiceDialog = false;
      state.invoices = state.invoices.map((invoice) =>
        invoice._id === action.payload.invoiceId
          ? action.payload.invoice
          : invoice
      ) as WritableDraft<Invoice>[];
    });
    builder.addCase(updateInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
    // DELETE INVOICE
    builder.addCase(deleteInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = state.invoices.filter(
        (invoice) => invoice._id !== action.payload
      );
    });
    builder.addCase(deleteInvoice.rejected, (state, action) => {
      state.loading = false;
      state.message = action.error.message as string;
    });
  },
});

export const { setNewInvoiceDialog, setEditInvoiceDialog, setSelectedInvoice } =
  projectListSlice.actions;

export default projectListSlice.reducer;
