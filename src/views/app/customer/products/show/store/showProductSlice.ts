import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IProduct, SizeSelection } from '@/@types/product';
import { apiGetProductById } from '@/services/ProductServices';
import { FileItem, IFormAnswer } from '@/@types/formAnswer';
import { API_BASE_URL } from '@/configs/api.config';

export const SLICE_NAME = 'showProduct'

export type StateData = {
    loading: boolean
    product: IProduct | null
    formCompleted: boolean
    formDialog: boolean
    formAnswer: IFormAnswer | null
    sizesSelected: SizeSelection[],
    cartItemId: string
    filesLoaded: FileItem[]
}

const initialState: StateData = {
  loading: false,
  product: null,
  formCompleted: false,
  formDialog: false,
  formAnswer: null,
  sizesSelected: [],
  cartItemId: '',
  filesLoaded: []
};

export const getProductById = createAsyncThunk(
    SLICE_NAME + '/getProduct',
    async (id: string) => {
        const response = await apiGetProductById(id)
        return response.data
    }
)

const loadFile = async (
    fileName: string
  ) : Promise<File | null> => {
    try {
      const response = await fetch(API_BASE_URL + "/upload/" + fileName, {
            method: "GET"
        });
        const blob = await response.blob();
        return new File([blob], fileName, { type: blob.type });
    } catch (error) {
        console.error("Erreur lors de la récupération du fichier :", error);
    }
    return null
  };

export const loadFiles = createAsyncThunk(
    SLICE_NAME + '/loadFiles',
    async (fileNames: string[]) : Promise<FileItem[]> => {
        const files : FileItem[] = []
        fileNames.forEach(async (fileName) => {
            const file = await loadFile(fileName)
            if (file) {
                files.push({fileName, file})
            }
        })
        return files
    }
)

const productSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
        setFormCompleted: (state, action) => {
            state.formCompleted = action.payload
        },
        setFormDialog: (state, action) => {
            state.formDialog = action.payload
        },
        setFormAnswer: (state, action) => {
            state.formAnswer = action.payload
        },
        setSizesSelected: (state, action) => {
            state.sizesSelected = action.payload
        },
        setCartItemId: (state, action) => {
            state.cartItemId = action.payload
        },
        setProduct: (state, action) => {
            state.product = action.payload
        },
        setFilesLoaded: (state, action) => {
            state.filesLoaded = action.payload
        },
        clearState: (state) => {
            state.formCompleted = false
            state.formDialog = false
            state.product = null
            state.sizesSelected = []
            state.formAnswer = null
            state.filesLoaded = []
            // Ajouter suppression des valeurs du form
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getProductById.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getProductById.fulfilled, (state, action) => {
            state.loading = false;
            state.product = action.payload.product as unknown as IProduct;
        });
        builder.addCase(getProductById.rejected, (state) => {
            state.loading = false;
        });
        builder.addCase(loadFiles.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(loadFiles.fulfilled, (state, action) => {
            state.loading = false;
            state.filesLoaded = [...state.filesLoaded, ...action.payload];
        });
        builder.addCase(loadFiles.rejected, (state) => {
            state.loading = false;
        });
    }
})

export const {
    clearState,
    setFormCompleted,
    setFormDialog,
    setFormAnswer,
    setSizesSelected,
    setCartItemId,
    setProduct,
    setFilesLoaded
} = productSlice.actions

export default productSlice.reducer
