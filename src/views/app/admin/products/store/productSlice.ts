import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import {
  apiGetProducts,
  apiDeleteProduct,
  apiUpdateProduct,
  GetProductsRequest,
  GetProductsResponse,
  apiCreateProduct,
  DeleteProductResponse,
  apiGetProductForEditById,
} from '@/services/ProductServices';
import { apiGetPegFiles } from '@/services/FileServices';
import { unwrapData } from '@/utils/serviceHelper';

export const SLICE_NAME = 'products';

export type StateData = {
  loading: boolean;
  products: Product[];
  productToEdit: Product | null;
  modalDeleteProduct: boolean;
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
    const {
      products_connection,
    }: { products_connection: GetProductsResponse } = await unwrapData(
      apiGetProducts(data)
    );
    return products_connection;
  }
);

export const getProductById = createAsyncThunk(
  SLICE_NAME + '/getProduct',
  async (documentId: string): Promise<{ product: Product }> => {
    return await unwrapData(apiGetProductForEditById(documentId));
  }
);

export const duplicateProduct = createAsyncThunk(
  SLICE_NAME + '/duplicateProduct',
  async (product: Product) => {
    const { product: productToDuplicate }: { product: Product } =
      await unwrapData(apiGetProductForEditById(product.documentId));
    const { documentId, images, ...duplicatedProduct } = productToDuplicate;
    const imagesLoaded: PegFile[] = await apiGetPegFiles(images);
    const newProduct: Product = {
      ...duplicatedProduct,
      images: imagesLoaded.map(({ id }) => id),
      sizes: duplicatedProduct.sizes.map(({ documentId }) => documentId),
      colors: duplicatedProduct.colors.map(({ documentId }) => documentId),
      form: duplicatedProduct.form?.documentId,
      productCategory: duplicatedProduct.productCategory?.documentId,
      customerCategories: duplicatedProduct.customerCategories.map(
        ({ documentId }) => documentId
      ),
      customers: duplicatedProduct.customers.map(
        ({ documentId }) => documentId
      ),
    };
    const { createProduct }: { createProduct: Product } = await unwrapData(
      apiCreateProduct(newProduct)
    );
    return createProduct;
  }
);

export const updateProduct = createAsyncThunk(
  SLICE_NAME + '/updateProduct',
  async (data: Partial<Product>): Promise<Product> => {
    const { updateProduct }: { updateProduct: Product } = await unwrapData(
      apiUpdateProduct(data)
    );
    return updateProduct;
  }
);

export const deleteProduct = createAsyncThunk(
  SLICE_NAME + '/deleteProduct',
  async (documentId: string): Promise<DeleteProductResponse> => {
    const { deleteProduct }: { deleteProduct: DeleteProductResponse } =
      await unwrapData(apiDeleteProduct(documentId));
    //TODO: à remettre
    //apiDeleteFiles(data.product.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProduct;
  }
);

const initialState: StateData = {
  loading: false,
  products: [],
  productToEdit: null,
  modalDeleteProduct: false,
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
    setProductToEdit: (state, action) => {
      state.productToEdit = action.payload;
    },
    setModalDeleteProductOpen: (state) => {
      state.modalDeleteProduct = true;
    },
    setModalDeleteProductClose: (state) => {
      state.modalDeleteProduct = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProducts.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
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
      state.total -= 1;
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
      state.total += 1;
    });
    builder.addCase(duplicateProduct.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(getProductById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductById.fulfilled, (state, action) => {
      state.loading = false;
      state.productToEdit = action.payload.product;
    });
    builder.addCase(getProductById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setProductToEdit,
  setModalDeleteProductOpen,
  setModalDeleteProductClose,
} = productSlice.actions;

export default productSlice.reducer;
