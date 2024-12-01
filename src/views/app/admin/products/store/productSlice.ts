import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IProduct, Product } from '@/@types/product';
import {
  apiGetProducts,
  apiPutStatusProduct,
  apiDeleteProduct,
  apiUpdateProduct,
  apiGetProductsByCategory,
  apiNewProduct,
  GetProductsRequest,
  GetProductsResponse,
  apiCreateProduct,
  DeleteProductResponse,
} from '@/services/ProductServices';
import { apiDeleteFiles } from '@/services/FileServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'products';

export type StateData = {
  loading: boolean;
  products: Product[];
  product: IProduct | null;
  modalDelete: boolean;
  total: number;
  result: boolean;
  message: string;
  stats: {
    depense: number;
    recette: number;
    bilan: number;
  };
};

export type StatsTypesResponses = {
  depense: number;
  recette: number;
  bilan: number;
};

export const getProducts = createAsyncThunk(
  SLICE_NAME + '/getProducts',
  async (data: GetProductsRequest): Promise<GetProductsResponse> => {
    const {products_connection} : {products_connection: GetProductsResponse}= await unwrapData(apiGetProducts(data));
    return products_connection
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (id: string) => {
    const response = await apiGetProductsByCategory(id);
    return response.data;
  }
);

type PutStatusProductRequest = {
  id: string;
};

export const putStatusProduct = createAsyncThunk(
  SLICE_NAME + '/putStatusProduct',
  async (data: PutStatusProductRequest) => {
    const response = await apiPutStatusProduct(data.id);
    return response.data;
  }
);

type DuplicateProductRequest = {
  product: Product;
};

export const duplicateProduct = createAsyncThunk(
  SLICE_NAME + '/duplicateProduct',
  async (data: DuplicateProductRequest) => {
    const {documentId, ...duplicatedProduct} = data.product,
      response = await apiCreateProduct(duplicatedProduct);
    return response.data;
  }
);

type UpdateProductRequest = {
  product: IProduct;
};

export const updateProduct = createAsyncThunk(
  SLICE_NAME + '/updateProduct',
  async (data: UpdateProductRequest) => {
    const response = await apiUpdateProduct(data.product);
    return response.data;
  }
);

export const deleteProduct = createAsyncThunk(
  SLICE_NAME + '/deleteProduct',
  async (documentId: string): Promise<DeleteProductResponse> => {
    const {deleteProduct} : {deleteProduct: DeleteProductResponse} = await unwrapData(apiDeleteProduct(documentId));
    //TODO: à remettre
    //apiDeleteFiles(data.product.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProduct;
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
};

const productSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setTableData: (state, action) => {
      state.products = action.payload;
    },
    setProduct: (state, action) => {
      state.product =
        state.products.find((product) => product._id === action.payload) ??
        null;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
    setEditProduct: (state, action) => {
      const product = state.products.find(
        (product) => product._id === action.payload._id
      );
      if (product) {
        state.product = product;
      }
    },
    setEditingProduct: (state, action) => {
      state.product = action.payload;
    },
    setActiveProduct: (state, action) => {
      console.log(action.payload);
      const productId = action.payload.id;
      const isActive = action.payload.mode;

      const product = state.products.find(
        (product) => product._id === productId
      );
      if (product) {
        product.isActive = isActive;
      }
    },
    setDeleteProduct: (state, action) => {
      state.product =
        state.products.find((product) => product._id === action.payload) ??
        null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes as Product[];
    });
    builder.addCase(getProducts.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(putStatusProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(putStatusProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products = state.products.map((product) => {
        if (product._id === action.payload.product._id) {
          return action.payload.product;
        }
        return product;
      });
    });
    builder.addCase(putStatusProduct.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products = state.products.filter(
        (product) => product.documentId !== action.payload.documentId
      );
    });
    builder.addCase(deleteProduct.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(updateProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products = state.products.map((product) => {
        if (product._id === action.payload.product._id) {
          return action.payload.product;
        }
        return product;
      });
    });
    builder.addCase(updateProduct.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(duplicateProduct.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(duplicateProduct.fulfilled, (state, action) => {
      state.loading = false;
      state.products.push(action.payload.product);
    });
    builder.addCase(duplicateProduct.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getProductsByCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductsByCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.products;
    });
    builder.addCase(getProductsByCategory.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setTableData,
  setProduct,
  setModalDeleteOpen,
  setModalDeleteClose,
  setDeleteProduct,
  setActiveProduct,
  setEditingProduct,
} = productSlice.actions;

export default productSlice.reducer;
