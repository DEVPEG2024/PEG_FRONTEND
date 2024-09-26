import { createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import { WritableDraft } from 'immer'
import { apiGetTickets, apiCreateTicket, apiDeleteTicket, apiUpdateTicket, apiUpdateStatusTicket, apiUpdatePriorityTicket } from '@/services/TicketServices'

import { ITicket } from '@/@types/ticket'



export type ProjectListState = {
    tickets: ITicket[]
    total: number
    result: boolean
    message: string
    selectedTicket: ITicket | null
    newTicketDialog: boolean
    editTicketDialog: boolean
    loading: boolean
}
type Query = {
   page: number, pageSize: number, searchTerm: string 
}

type GetInvoiceListRequest = Query

export const SLICE_NAME = 'tickets'

export const getTickets = createAsyncThunk(
    SLICE_NAME + '/getTickets',
    async (data: GetInvoiceListRequest) => {
        const response = await apiGetTickets(data.page, data.pageSize, data.searchTerm);
        return response.data
    }
)

type CreateTicketRequest = {
        ticket: ITicket
    userId: string
}

export const createTicket = createAsyncThunk(
    SLICE_NAME + '/createTicket',
    async (data: CreateTicketRequest) => {
        const response = await apiCreateTicket(data);  
        return response.data    
    }
)       

type DeleteTicketRequest = {
    ticketId: string
}

export const deleteTicket = createAsyncThunk(
    SLICE_NAME + '/deleteTicket',
    async (data: DeleteTicketRequest) => {
        const response = await apiDeleteTicket(data);  
        return response.data.ticketId;
    }
)

type UpdateTicketRequest = {
    ticket: ITicket
    ticketId: string
}

export const updateTicket = createAsyncThunk(
    SLICE_NAME + '/updateTicket',
    async (data: UpdateTicketRequest) => {
       const response = await apiUpdateTicket(data);  
        return { ticket: response.data.ticket, ticketId: data.ticketId };
    }
)

type UpdateStatusTicketRequest = {
    ticketId: string
    status: string
}

export const updateStatusTicket = createAsyncThunk(
    SLICE_NAME + '/updateStatusTicket',
    async (data: UpdateStatusTicketRequest) => {
        await apiUpdateStatusTicket(data);   
        return {status: data.status, ticketId: data.ticketId};
    }
)

type UpdatePriorityTicketRequest = {
    ticketId: string
    priority: string
}

export const updatePriorityTicket = createAsyncThunk(
    SLICE_NAME + '/updatePriorityTicket',
    async (data: UpdatePriorityTicketRequest) => {
        await apiUpdatePriorityTicket(data);   
        return {priority: data.priority, ticketId: data.ticketId};
    }
)

const initialState: ProjectListState = {
    tickets: [],
    selectedTicket: null,
    newTicketDialog: false,
    editTicketDialog: false,
    loading: false,
    total: 0,
    result: false,
    message: '',
}


const projectListSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
      
        setNewTicketDialog: (state, action) => {
            state.newTicketDialog = action.payload
        },
        setEditTicketDialog: (state, action) => {
            state.editTicketDialog = action.payload
        },
        setSelectedTicket: (state, action) => {
            state.selectedTicket = action.payload
        },
    },
    extraReducers: (builder) => {
        // GET INVOICES
        builder.addCase(getTickets.pending, (state) => {
            state.loading = true
        })
        builder.addCase(getTickets.fulfilled, (state, action) => {
            state.loading = false
            state.tickets = action.payload.tickets as unknown as WritableDraft<ITicket>[]
            state.total = action.payload.total
        })
        // CREATE INVOICE
        builder.addCase(createTicket.pending, (state) => {
            state.loading = true
        })
        builder.addCase(createTicket.fulfilled, (state, action) => {
            state.loading = false
            state.newTicketDialog = false
            state.tickets.push(action.payload.ticket as never)
        })  
        builder.addCase(createTicket.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        // UPDATE INVOICE
        builder.addCase(updateTicket.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updateTicket.fulfilled, (state, action) => {
            state.loading = false;
            state.editTicketDialog = false;
            state.tickets = state.tickets.map((ticket) =>
                ticket._id === action.payload.ticketId
                    ? action.payload.ticket
                    : ticket   
            ) as WritableDraft<ITicket>[];
        });
        builder.addCase(updateTicket.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        // DELETE INVOICE
        builder.addCase(deleteTicket.pending, (state) => {
            state.loading = true
        })
        builder.addCase(deleteTicket.fulfilled, (state, action) => {
            state.loading = false
            state.tickets = state.tickets.filter(
                (ticket) => ticket._id !== action.payload
            );
        })
        builder.addCase(deleteTicket.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        builder.addCase(updateStatusTicket.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updateStatusTicket.fulfilled, (state, action) => {
            state.loading = false
            state.tickets = state.tickets.map((ticket) =>
                ticket._id === action.payload.ticketId
                    ? { ...ticket, status: action.payload.status }
                    : ticket
            )
            if(state.selectedTicket?._id === action.payload.ticketId){
                state.selectedTicket = {
                    ...state.selectedTicket,
                    status: action.payload.status,
                }
            }
        })
        builder.addCase(updateStatusTicket.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        builder.addCase(updatePriorityTicket.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updatePriorityTicket.fulfilled, (state, action) => {
            state.loading = false
            state.tickets = state.tickets.map((ticket) =>
                ticket._id === action.payload.ticketId
                    ? { ...ticket, priority: action.payload.priority }
                    : ticket
            )
            if(state.selectedTicket?._id === action.payload.ticketId){
                state.selectedTicket = {
                    ...state.selectedTicket,
                    priority: action.payload.priority,
                }
            }
        })
        builder.addCase(updatePriorityTicket.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
    }
})

export const {
  setNewTicketDialog,
  setEditTicketDialog,
  setSelectedTicket,
} = projectListSlice.actions;

export default projectListSlice.reducer;
