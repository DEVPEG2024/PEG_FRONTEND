import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  apiGetLeads,
  apiCreateLead,
  apiUpdateLead,
  apiDeleteLead,
  type GetLeadsRequest,
} from '@/services/LeadServices'
import type { Lead } from '@/@types/lead'

type LeadsState = {
  loading: boolean
  leads: Lead[]
  total: number
}

const initialState: LeadsState = {
  loading: false,
  leads: [],
  total: 0,
}

export const getLeads = createAsyncThunk(
  'leads/getLeads',
  async (params: GetLeadsRequest = {}) => {
    const res: any = await apiGetLeads(params)
    const data: Lead[] = res?.data?.data ?? []
    const total: number = res?.data?.meta?.pagination?.total ?? data.length
    return { data, total }
  }
)

export const createLead = createAsyncThunk(
  'leads/createLead',
  async (data: Omit<Lead, 'documentId' | 'createdAt'>) => {
    const res: any = await apiCreateLead(data)
    return res?.data?.data as Lead
  }
)

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ documentId, data }: { documentId: string; data: Partial<Omit<Lead, 'documentId' | 'createdAt'>> }) => {
    const res: any = await apiUpdateLead(documentId, data)
    return res?.data?.data as Lead
  }
)

export const deleteLead = createAsyncThunk(
  'leads/deleteLead',
  async (documentId: string) => {
    await apiDeleteLead(documentId)
    return documentId
  }
)

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getLeads.pending, (state) => {
        state.loading = true
      })
      .addCase(getLeads.fulfilled, (state, action) => {
        state.loading = false
        state.leads = action.payload.data
        state.total = action.payload.total
      })
      .addCase(getLeads.rejected, (state) => {
        state.loading = false
      })
      .addCase(createLead.fulfilled, (state, action) => {
        if (action.payload) {
          state.leads = [action.payload, ...state.leads]
          state.total += 1
        }
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        const updated = action.payload
        if (!updated?.documentId) return
        state.leads = state.leads.map((l) =>
          l.documentId === updated.documentId ? updated : l
        )
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter((l) => l.documentId !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })
  },
})

export default leadsSlice.reducer
