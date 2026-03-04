import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  apiGetCustomers,
  apiDeleteCustomer,
  apiGetCustomerForEditById,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiUploadFile,
  type GetCustomersRequest,
} from '@/services/CustomerServices'
import type { Customer } from '@/@types/customer'

type CustomersState = {
  loading: boolean
  customers: Customer[]
  total: number
  customer: Customer | null
}

const initialState: CustomersState = {
  loading: false,
  customers: [],
  total: 0,
  customer: null,
}

/**
 * Strapi v4 renvoie souvent:
 * - liste: { data: [{ id, attributes: {...} }], meta: {...} }
 * - item : { data: { id, attributes: {...} } }
 *
 * Ton UI attend un Customer "flat" + documentId.
 */
const normalizeStrapiEntity = (entity: any) => {
  if (!entity) return entity

  // Déjà flat
  if (!entity.attributes) {
    const id = entity.documentId ?? entity.id
    return {
      ...entity,
      documentId: entity.documentId ?? (id != null ? String(id) : undefined),
    }
  }

  // Strapi shape { id, attributes }
  const id = entity.id
  const attrs = entity.attributes ?? {}

  // Normalise relations (customerCategory, logo, etc.) si elles sont au format { data: {...} }
  const normalizeRelation = (rel: any) => {
    if (!rel) return rel
    if (rel.data === null) return null
    if (Array.isArray(rel.data)) return rel.data.map((x) => normalizeStrapiEntity(x))
    if (rel.data) return normalizeStrapiEntity(rel.data)
    return rel
  }

  return {
    ...attrs,
    id,
    documentId: String(id),
    customerCategory: normalizeRelation(attrs.customerCategory),
    logo: normalizeRelation((attrs as any).logo),
    banner: normalizeRelation((attrs as any).banner),
  }
}

export const getCustomers = createAsyncThunk(
  'customers/getCustomers',
  async (params: GetCustomersRequest) => {
    const res: any = await apiGetCustomers(params)

    // Supporte plusieurs shapes (selon ton ApiService)
    const raw = res?.data?.data ?? res?.data ?? []
    const meta = res?.data?.meta

    const list = Array.isArray(raw) ? raw.map((x) => normalizeStrapiEntity(x)) : []
    const total =
      meta?.pagination?.total ??
      meta?.pagination?.totalCount ??
      (Array.isArray(list) ? list.length : 0)

    return { data: list, total }
  }
)

export const getCustomerForEditById = createAsyncThunk(
  'customers/getCustomerForEditById',
  async (id: string) => {
    const res: any = await apiGetCustomerForEditById(id)
    const raw = res?.data?.data ?? res?.data ?? null
    return normalizeStrapiEntity(raw)
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string) => {
    await apiDeleteCustomer(id)
    return id
  }
)

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async ({ data, logoFile }: { data: any; logoFile?: File | null }) => {
    let payload = { ...data }

    if (logoFile) {
      const uploadRes: any = await apiUploadFile(logoFile)
      const uploaded = uploadRes?.data?.[0]
      if (uploaded?.id) payload.logo = uploaded.id
    }

    const res: any = await apiCreateCustomer(payload)
    const raw = res?.data?.data ?? null
    return normalizeStrapiEntity(raw)
  }
)

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({
    id,
    data,
    logoFile,
  }: {
    id: string
    data: any
    logoFile?: File | null
  }) => {
    let payload = { ...data }

    if (logoFile) {
      const uploadRes: any = await apiUploadFile(logoFile)
      const uploaded = uploadRes?.data?.[0]
      if (uploaded?.id) payload.logo = uploaded.id
    }

    const res: any = await apiUpdateCustomer(id, payload)
    const raw = res?.data?.data ?? null
    return normalizeStrapiEntity(raw)
  }
)

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.customer = action.payload
    },
    clearCustomers: (state) => {
      state.customers = []
      state.total = 0
    },
  },
  extraReducers: (builder) => {
    builder
      // LIST
      .addCase(getCustomers.pending, (state) => {
        state.loading = true
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.loading = false
        state.customers = action.payload.data
        state.total = action.payload.total
      })
      .addCase(getCustomers.rejected, (state) => {
        state.loading = false
      })

      // EDIT LOAD
      .addCase(getCustomerForEditById.pending, (state) => {
        state.loading = true
      })
      .addCase(getCustomerForEditById.fulfilled, (state, action) => {
        state.loading = false
        state.customer = action.payload
      })
      .addCase(getCustomerForEditById.rejected, (state) => {
        state.loading = false
      })

      // DELETE
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        const id = String(action.payload)
        state.customers = state.customers.filter((c: any) => {
          const doc = c?.documentId != null ? String(c.documentId) : ''
          const cid = c?.id != null ? String(c.id) : ''
          return doc !== id && cid !== id
        })
        state.total = Math.max(0, state.total - 1)
      })

      // CREATE (optionnel: on l’ajoute en tête)
      .addCase(createCustomer.fulfilled, (state, action) => {
        if (action.payload) {
          state.customers = [action.payload, ...state.customers]
          state.total = state.total + 1
        }
      })

      // UPDATE (optionnel: on remplace en liste)
      .addCase(updateCustomer.fulfilled, (state, action) => {
        if (!action.payload) return
        const updated: any = action.payload
        const targetId = String(updated.documentId ?? updated.id)
        state.customers = state.customers.map((c: any) => {
          const cid = String(c?.documentId ?? c?.id ?? '')
          return cid === targetId ? updated : c
        })
        // Si on était sur page edit, on met aussi customer
        state.customer = updated
      })
  },
})

export const { setCustomer, clearCustomers } = customersSlice.actions
export default customersSlice.reducer