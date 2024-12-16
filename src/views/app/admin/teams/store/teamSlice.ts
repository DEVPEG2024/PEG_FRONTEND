import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Image, Product } from '@/@types/product';
import {
  apiGetProducts,
  apiDeleteProduct,
  apiUpdateProduct,
  apiGetProductsByCategory,
  GetProductsRequest,
  GetProductsResponse,
  apiCreateProduct,
  DeleteProductResponse,
  apiGetProductForEditById,
} from '@/services/ProductServices';
import { apiGetImages } from '@/services/FileServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'teams';

export type StateData = {
  loading: boolean;
  teams: Team[];
  team: Team | null;
  modalDelete: boolean;
  total: number;
};

export const getTeams = createAsyncThunk(
  SLICE_NAME + '/getTeams',
  async (data: GetTeamsRequest): Promise<GetTeamsResponse> => {
    const {teams_connection} : {teams_connection: GetTeamsResponse}= await unwrapData(apiGetTeams(data));
    return teams_connection
  }
);

export const getProductById = createAsyncThunk(
  SLICE_NAME + '/getProduct',
  async (documentId: string): Promise<{product: Product}> => {
    return await unwrapData(apiGetProductForEditById(documentId));
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (id: string) => {
    const response = await apiGetProductsByCategory(id);
    return response.data;
  }
);

export const duplicateProduct = createAsyncThunk(
  SLICE_NAME + '/duplicateProduct',
  async (product: Product) => {
    const {product: productToDuplicate} : {product: Product} = await unwrapData(apiGetProductForEditById(product.documentId))
    const {documentId, images, ...duplicatedProduct} = productToDuplicate
    const imagesLoaded : Image[] = await apiGetImages(images)
    const newProduct: Product = {
      ...duplicatedProduct,
      images: imagesLoaded.map(({id}) => id),
      sizes: duplicatedProduct.sizes.map(({documentId}) => documentId),
      form: duplicatedProduct.form?.documentId,
      productCategory: duplicatedProduct.productCategory?.documentId,
      customerCategories: duplicatedProduct.customerCategories.map(({documentId}) => documentId),
      customers: duplicatedProduct.customers.map(({documentId}) => documentId),
    }
    const {createProduct} : {createProduct: Product}= await unwrapData(apiCreateProduct(newProduct));
    return createProduct;
  }
);

export const updateProduct = createAsyncThunk(
  SLICE_NAME + '/updateProduct',
  async (data: Partial<Product>): Promise<Product> => {
    const {updateProduct} : {updateProduct: Product} = await unwrapData(apiUpdateProduct(data));
    return updateProduct;
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
    setProduct: (state, action) => {
      state.product = action.payload;
    },
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes;
    });
    builder.addCase(getProducts.rejected, (state) => {
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
        if (product.documentId === action.payload.documentId) {
          return action.payload;
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
      state.products.push(action.payload);
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

    builder.addCase(getProductById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductById.fulfilled, (state, action) => {
      state.loading = false;
      state.product = action.payload.product;
    });
    builder.addCase(getProductById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setProduct,
  setModalDeleteOpen,
  setModalDeleteClose,
} = productSlice.actions;

export default productSlice.reducer;
