import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { IProduct } from '@/@types/product'
import { apiPutStatusProduct, apiDeleteProduct, apiUpdateProduct, apiGetProductsCustomer } from '@/services/ProductServices'


type Products = IProduct[]


export type StateData = {
    loading: boolean
    products: Products
    product: IProduct | null
    modalDelete: boolean
    total: number
    result: boolean
    message: string
    stats: {
        depense: number
        recette: number
        bilan: number
    }
    formCompleted: boolean
    formDialog: boolean
}

export type StatsTypesResponses = {
    depense: number
    recette: number
    bilan: number
}
type Query = {
    page: number, pageSize: number, searchTerm: string, userId: string, userCategoryId: string
 }
 
 type GetProductListRequest = Query
export const SLICE_NAME = 'products'


export const getProducts = createAsyncThunk(
    SLICE_NAME + '/getProducts',
    async (data: GetProductListRequest) => {
        const response = await apiGetProductsCustomer(data.page, data.pageSize, data.searchTerm, data.userId, data.userCategoryId)
        return response.data
    }
)

type PutStatusProductRequest = {
  id: string
}

export const putStatusProduct = createAsyncThunk(
  SLICE_NAME + "/putStatusProduct",
  async (data: PutStatusProductRequest) => {
    const response = await apiPutStatusProduct(data.id)
    return response.data
}
);

type UpdateProductRequest = {
  product: IProduct
}

export const updateProduct = createAsyncThunk(
  SLICE_NAME + "/updateProduct",
  async (data: UpdateProductRequest) => {
    const response = await apiUpdateProduct(data.product)
    return response.data
}
);

export const deleteProduct = createAsyncThunk(
  SLICE_NAME + "/deleteProduct",
  async (data: PutStatusProductRequest) => {
    const response = await apiDeleteProduct(data.id)
    return response.data
}
);

const initialState: StateData = {
  loading: false,
  products: [],
  product: null,
  modalDelete: false,
  total: 0,
  result: false,
  message: '',
  stats: {
    depense: 0,
    recette: 0,
    bilan: 0,
  },
  formCompleted: false,
  formDialog: false
};

const productSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        setTableData: (state, action) => {
            state.products = action.payload
        },
        setProduct: (state, action) => {
            state.product = state.products.find((product) => product._id === action.payload) ?? null
        },
        setModalDeleteOpen: (state) => {
            state.modalDelete = true
        },
        setModalDeleteClose: (state) => {
            state.modalDelete = false
        },
        setEditProduct: (state, action) => {
            const product = state.products.find((product) => product._id === action.payload._id);
            if (product) {
                state.product = product;
            }
        },
        setEditingProduct: (state, action) => {
            state.product = action.payload
        },
        setActiveProduct: (state, action) => {
            console.log(action.payload)
            const productId = action.payload.id;
            const isActive = action.payload.mode;

            const product = state.products.find((product) => product._id === productId);
            if (product) {
                product.isActive = isActive;
            }
        },
        setDeleteProduct: (state, action) => {
            state.product = state.products.find((product) => product._id === action.payload) ?? null
        },
        // Créer une nouvelle slice pour le form
        setFormCompleted: (state, action) => {
            state.formCompleted = action.payload
        },
        setFormDialog: (state, action) => {
            state.formDialog = action.payload
        },
        clearShowProductState: (state) => {
            state.formCompleted = false
            state.formDialog = false
            // Ajouter suppression des valeurs du form
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getProducts.pending, (state) => {
            state.loading = true
        })
        builder.addCase(getProducts.fulfilled, (state, action) => {
            state.loading = false
            state.products = action.payload.products
        })
        builder.addCase(getProducts.rejected, (state) => {
            state.loading = false
        })
        builder.addCase(putStatusProduct.pending, (state) => {
            state.loading = true
        })
        builder.addCase(putStatusProduct.fulfilled, (state, action) => {
            state.loading = false
            state.products = state.products.map((product) => {
                if (product._id === action.payload.product._id) {
                    return action.payload.product
                }
                return product
            })
        })
        builder.addCase(putStatusProduct.rejected, (state) => {
            state.loading = false
        })
        builder.addCase(deleteProduct.pending, (state) => {
            state.loading = true
        })
        builder.addCase(deleteProduct.fulfilled, (state, action) => {
            state.loading = false
            state.products = state.products.filter((product) => product._id !== action.payload.product._id)
        })
        builder.addCase(deleteProduct.rejected, (state) => {
            state.loading = false
        })
        builder.addCase(updateProduct.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updateProduct.fulfilled, (state, action) => {
            state.loading = false
            state.products = state.products.map((product) => {
                if (product._id === action.payload.product._id) {
                    return action.payload.product
                }   
                return product
            })
        })
        builder.addCase(updateProduct.rejected, (state) => {
            state.loading = false
        })
    },
  
})

export const {
    clearShowProductState,
    setTableData,
    setProduct,
    setModalDeleteOpen,
    setModalDeleteClose,
    setDeleteProduct,
    setActiveProduct,
    setEditingProduct,
    setFormCompleted,
    setFormDialog
} = productSlice.actions

export default productSlice.reducer
