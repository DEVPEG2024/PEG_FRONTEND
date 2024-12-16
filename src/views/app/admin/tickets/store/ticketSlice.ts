import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  apiGetTickets,
  apiCreateTicket,
  apiDeleteTicket,
  apiUpdateTicket,
  GetTicketsRequest,
  GetTicketsResponse,
  apiGetTicketForEditById,
  CreateTicketRequest,
  DeleteTicketResponse,
} from '@/services/TicketServices';

import { Ticket } from '@/@types/ticket';
import { unwrapData } from '@/utils/serviceHelper';
import { Image } from '@/@types/product';
import { apiUploadFile } from '@/services/FileServices';

export const SLICE_NAME = 'tickets';

export type TicketState = {
  tickets: Ticket[];
  total: number;
  selectedTicket: Ticket | null;
  newTicketDialog: boolean;
  editTicketDialog: boolean;
  loading: boolean;
};

export const getTickets = createAsyncThunk(
  SLICE_NAME + '/getTickets',
  async (data: GetTicketsRequest) : Promise<GetTicketsResponse> => {
    const {tickets_connection} : {tickets_connection: GetTicketsResponse} = await unwrapData(apiGetTickets(data));
    return tickets_connection;
  }
);

export const getTicketById = createAsyncThunk(
  SLICE_NAME + '/getTicketById',
  async (documentId: string): Promise<{ticket: Ticket}> => {
    return await unwrapData(apiGetTicketForEditById(documentId));
  }
);

export const createTicket = createAsyncThunk(
  SLICE_NAME + '/createTicket',
  async (data: CreateTicketRequest) : Promise<Ticket> => {
    let imageUploaded : Image | undefined = undefined
    if(data.image) {
      imageUploaded = await apiUploadFile(data.image.file)
    }
    const {createTicket} : {createTicket: Ticket} = await unwrapData(apiCreateTicket({...data, image: imageUploaded?.id ?? undefined}));
    return createTicket;
  }
);

export const deleteTicket = createAsyncThunk(
  SLICE_NAME + '/deleteTicket',
  async (documentId: string): Promise<DeleteTicketResponse> => {
    const {deleteTicket} : {deleteTicket: DeleteTicketResponse} = await unwrapData(apiDeleteTicket(documentId));
    return deleteTicket;
  }
);

export const updateTicket = createAsyncThunk(
  SLICE_NAME + '/updateTicket',
  async (data: Partial<Ticket>): Promise<Ticket> => {
    const {updateTicket} : {updateTicket: Ticket} = await unwrapData(apiUpdateTicket(data));
    return updateTicket;
  }
);

const initialState: TicketState = {
  tickets: [],
  selectedTicket: null,
  newTicketDialog: false,
  editTicketDialog: false,
  loading: false,
  total: 0,
};

const projectListSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewTicketDialog: (state, action) => {
      state.newTicketDialog = action.payload;
    },
    setEditTicketDialog: (state, action) => {
      state.editTicketDialog = action.payload;
    },
    setSelectedTicket: (state, action) => {
      state.selectedTicket = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET TICKETS
    builder.addCase(getTickets.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getTickets.fulfilled, (state, action) => {
      state.loading = false;
      state.tickets = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getTickets.rejected, (state) => {
      state.loading = true;
    });

    builder.addCase(getTicketById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getTicketById.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedTicket = action.payload.ticket;
    });
    builder.addCase(getTicketById.rejected, (state) => {
      state.loading = false;
    });
    
    // CREATE TICKET
    builder.addCase(createTicket.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createTicket.fulfilled, (state, action) => {
      state.loading = false;
      state.tickets.push(action.payload);
      state.total += 1
    });
    builder.addCase(createTicket.rejected, (state) => {
      state.loading = false;
    });
    
    // UPDATE TICKET
    builder.addCase(updateTicket.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateTicket.fulfilled, (state, action) => {
      state.loading = false;
      state.tickets = state.tickets.map((ticket) =>
        ticket.documentId === action.payload.documentId ? action.payload : ticket
      );
    });
    builder.addCase(updateTicket.rejected, (state) => {
      state.loading = false;
    });

    // DELETE TICKET
    builder.addCase(deleteTicket.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteTicket.fulfilled, (state, action) => {
      state.loading = false;
      state.tickets = state.tickets.filter((ticket) => ticket.documentId !== action.payload.documentId);
      state.total -= 1
    });
    builder.addCase(deleteTicket.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setNewTicketDialog, setEditTicketDialog, setSelectedTicket } =
  projectListSlice.actions;

export default projectListSlice.reducer;
