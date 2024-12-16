import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Image, ProductCategory } from '@/@types/product';

import { unwrapData } from '@/utils/serviceHelper';
import { apiCreateProductCategory, apiDeleteProductCategory, apiGetProductCategories, CreateProductCategoryRequest, DeleteProductCategoryResponse, GetProductCategoriesRequest, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';
import { apiUploadFile } from '@/services/FileServices';

export const SLICE_NAME = 'productCategories';

export type StateData = {
  loading: boolean;
  productCategories: ProductCategory[];
  modalDelete: boolean;
  total: number;
};

export const getProductCategories = createAsyncThunk(
  SLICE_NAME + '/getProductCategories',
  async (data: GetProductCategoriesRequest) : Promise<GetProductCategoriesResponse> => {
    const {productCategories_connection} : {productCategories_connection: GetProductCategoriesResponse} = await unwrapData(apiGetProductCategories(data));
    return productCategories_connection;
  }
);

export const deleteProductCategory = createAsyncThunk(
  SLICE_NAME + '/deleteProductCategory',
  async (documentId: string): Promise<DeleteProductCategoryResponse> => {
    const {deleteProductCategory} : {deleteProductCategory: DeleteProductCategoryResponse} = await unwrapData(apiDeleteProductCategory(documentId));
    //TODO: à remettre
    //apiDeleteFiles(data.product.images.map(({ fileNameBack }) => fileNameBack));
    return deleteProductCategory;
  }
);

export const createProductCategory = createAsyncThunk(
  SLICE_NAME + '/createProductCategory',
  async (data: CreateProductCategoryRequest) : Promise<ProductCategory> => {
    const imageUploaded: Image | undefined = data.image ? await apiUploadFile(data.image.file) : undefined
    const {createProductCategory} : {createProductCategory: ProductCategory} = await unwrapData(apiCreateProductCategory({...data, image: imageUploaded?.id ?? undefined}));
    return createProductCategory;
  }
);

const initialState: StateData = {
  loading: false,
  productCategories: [],
  modalDelete: false,
  total: 0
};

const productCategoriesSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setModalDeleteOpen: (state) => {
      state.modalDelete = true;
    },
    setModalDeleteClose: (state) => {
      state.modalDelete = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProductCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategories.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategories = action.payload.nodes as ProductCategory[];
      state.total = action.payload.pageInfo.total
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
      state.total += 1
    });
    builder.addCase(createProductCategory.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteProductCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteProductCategory.fulfilled, (state, action) => {
      state.loading = false;
      state.productCategories = state.productCategories.filter((productCategory) => productCategory.documentId !== action.payload.documentId);
      state.total -= 1
    });
    builder.addCase(deleteProductCategory.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setModalDeleteOpen,
  setModalDeleteClose,
} = productCategoriesSlice.actions;

export default productCategoriesSlice.reducer;
