import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Invoice, InvoiceOld } from '@/@types/invoice';
import {
  apiCreateInvoice,
  apiDeleteInvoice,
  apiGetInvoices,
  apiUpdateInvoice,
  DeleteInvoiceResponse,
  GetInvoicesRequest,
  GetInvoicesResponse,
} from '@/services/InvoicesServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'invoices';

export type ProjectListState = {
  invoices: Invoice[];
  total: number;
  selectedInvoice: Invoice | null;
  newInvoiceDialog: boolean;
  editInvoiceDialog: boolean;
  printInvoiceDialog: boolean;
  loading: boolean;
};

export const getInvoices = createAsyncThunk(
  SLICE_NAME + '/getInvoices',
  async (data: GetInvoicesRequest) : Promise<GetInvoicesResponse> => {
    const {invoices_connection} : {invoices_connection: GetInvoicesResponse} = await unwrapData(apiGetInvoices(data));
    return invoices_connection;
  }
);

type CreateInvoiceRequest = {
  invoice: InvoiceOld;
  sellerId: string;
};

export const createInvoice = createAsyncThunk(
  SLICE_NAME + '/createInvoice',
  async (data: CreateInvoiceRequest) => {
    const response = await apiCreateInvoice(data);
    return response.data;
  }
);

export const deleteInvoice = createAsyncThunk(
  SLICE_NAME + '/apiDeleteInvoice',
  async (documentId: string): Promise<DeleteInvoiceResponse> => {
    const {deleteInvoice} : {deleteInvoice: DeleteInvoiceResponse} = await unwrapData(apiDeleteInvoice(documentId));
    return deleteInvoice;
  }
);

export const updateInvoice = createAsyncThunk(
  SLICE_NAME + '/updateInvoice',
  async (data: Partial<Invoice>): Promise<Invoice> => {
    const {updateInvoice} : {updateInvoice: Invoice} = await unwrapData(apiUpdateInvoice(data));
    return updateInvoice;
  }
);

const initialState: ProjectListState = {
  invoices: [],
  selectedInvoice: null,
  newInvoiceDialog: false,
  editInvoiceDialog: false,
  printInvoiceDialog: false,
  loading: false,
  total: 0,
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
    setPrintInvoiceDialog: (state, action) => {
      state.printInvoiceDialog = action.payload;
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
      state.invoices = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
      state.loading = false;
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
      state.invoices = state.invoices.map((invoice) =>
        invoice.documentId === action.payload.documentId ? action.payload : invoice
      );
    });
    builder.addCase(updateInvoice.rejected, (state) => {
      state.loading = false;
    });
    // DELETE INVOICE
    builder.addCase(deleteInvoice.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteInvoice.fulfilled, (state, action) => {
      state.loading = false;
      state.invoices = state.invoices.filter((invoice) => invoice.documentId !== action.payload.documentId);
      state.total -= 1
    });
    builder.addCase(deleteInvoice.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setNewInvoiceDialog, setEditInvoiceDialog, setPrintInvoiceDialog, setSelectedInvoice } =
  projectListSlice.actions;

export default projectListSlice.reducer;
