import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Product, ProductCategory } from '@/@types/product';
import { Image } from '@/@types/image';

import { unwrapData } from '@/utils/serviceHelper';
import {
  apiCreateProductCategory,
  apiDeleteProductCategory,
  apiGetProductCategories,
  apiGetProductCategoryById,
  CreateProductCategoryRequest,
  DeleteProductCategoryResponse,
  GetProductCategoriesRequest,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';
import { apiUploadFile } from '@/services/FileServices';
import {
  apiGetProductsByCategory,
  GetProductsByCategoryRequest,
  GetProductsResponse,
} from '@/services/ProductServices';

export const SLICE_NAME = 'productCategories';

export type StateData = {
  loading: boolean;
  productCategories: ProductCategory[];
  products: Product[];
  productCategory?: ProductCategory;
  modalDeleteProductCategoryOpen: boolean;
  total: number;
};

export const getProductCategories = createAsyncThunk(
  SLICE_NAME + '/getProductCategories',
  async (
    data: GetProductCategoriesRequest
  ): Promise<GetProductCategoriesResponse> => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories(data));
    return productCategories_connection;
  }
);

export const deleteProductCategory = createAsyncThunk(
  SLICE_NAME + '/deleteProductCategory',
  async (documentId: string): Promise<DeleteProductCategoryResponse> => {
    const {
      deleteProductCategory,
    }: { deleteProductCategory: DeleteProductCategoryResponse } =
      await unwrapData(apiDeleteProductCategory(documentId));
    //TODO: à remettre
    //apiDeleteFiles(data.product.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProductCategory;
  }
);

export const createProductCategory = createAsyncThunk(
  SLICE_NAME + '/createProductCategory',
  async (data: CreateProductCategoryRequest): Promise<ProductCategory> => {
    const imageUploaded: Image | undefined = data.image
      ? await apiUploadFile(data.image.file)
      : undefined;
    const {
      createProductCategory,
    }: { createProductCategory: ProductCategory } = await unwrapData(
      apiCreateProductCategory({
        ...data,
        image: imageUploaded?.id ?? undefined,
      })
    );
    return createProductCategory;
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (data: GetProductsByCategoryRequest) => {
    const {
      products_connection,
    }: { products_connection: GetProductsResponse } = await unwrapData(
      apiGetProductsByCategory(data)
    );
    return products_connection;
  }
);

export const getProductCategoryById = createAsyncThunk(
  SLICE_NAME + '/getProductCategoryById',
  async (documentId: string): Promise<{ productCategory: ProductCategory }> => {
    return await unwrapData(apiGetProductCategoryById(documentId));
  }
);

const initialState: StateData = {
  loading: false,
  productCategories: [],
  products: [],
  modalDeleteProductCategoryOpen: false,
  productCategory: undefined,
  total: 0,
};

const productCategoriesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setModalDeleteProductCategoryOpen: (state) => {
      state.modalDeleteProductCategoryOpen = true;
    },
    setModalDeleteProductCategoryClose: (state) => {
      state.modalDeleteProductCategoryOpen = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProductCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategories.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategories = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getProductCategories.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(createProductCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createProductCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategories.push(action.payload);
      state.total += 1;
    });
    builder.addCase(createProductCategory.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteProductCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProductCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategories = state.productCategories.filter(
        (productCategory) =>
          productCategory.documentId !== action.payload.documentId
      );
      state.total -= 1;
    });
    builder.addCase(deleteProductCategory.rejected, (state) => {
      state.loading = false;
    });

    // GET PRODUCTS BY CATEGORY
    builder.addCase(getProductsByCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductsByCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload.nodes;
    });
    builder.addCase(getProductsByCategory.rejected, (state) => {
      state.loading = false;
    });

    // GET PRODUCT CATEGORY BY ID
    builder.addCase(getProductCategoryById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategoryById.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategory = action.payload.productCategory;
    });
    builder.addCase(getProductCategoryById.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setModalDeleteProductCategoryOpen,
  setModalDeleteProductCategoryClose,
} = productCategoriesSlice.actions;

export default productCategoriesSlice.reducer;
