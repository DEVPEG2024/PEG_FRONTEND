import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product, ProductCategory } from '@/@types/product';
import { PegFile, UploadImage } from '@/@types/pegFile';

import { ApiResponse, unwrapData } from '@/utils/serviceHelper';
import {
  apiCreateProductCategory,
  apiDeleteProductCategory,
  apiGetProductCategories,
  apiGetProductCategoryById,
  apiUpdateProductCategory,
  CreateProductCategoryRequest,
  DeleteProductCategoryResponse,
  GetProductCategoriesRequest,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';
import { apiUploadFile } from '@/services/FileServices';
import {
  apiGetAdminProductsByCategory,
  GetProductsByCategoryRequest,
  GetProductsResponse,
} from '@/services/ProductServices';
import { AxiosResponse } from 'axios';

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
    const imageUploaded: PegFile | undefined = data.image
      ? await apiUploadFile(data.image.file)
      : undefined;
    const {
      createProductCategory,
    }: { createProductCategory: ProductCategory } = await unwrapData(
      apiCreateProductCategory({
        ...data,
        // Le backend GraphQL attend l'`id` du média (string), pas l'objet PegFile.
        image: (imageUploaded?.id ?? undefined) as unknown as PegFile | undefined,
      })
    );
    return createProductCategory;
  }
);

export type UpdateProductCategory = {
  // `image` est ici l'image d'upload locale (UploadImage), convertie en id
  // média avant l'appel GraphQL ; `parent` est envoyé comme documentId (string).
  productCategory: Omit<Partial<ProductCategory>, 'image' | 'parent'> & {
    image?: UploadImage;
    parent?: string | null;
  };
  imageModified: boolean;
};

export const updateProductCategory = createAsyncThunk(
  SLICE_NAME + '/updateProductCategory',
  async (data: UpdateProductCategory): Promise<ProductCategory> => {
    let imageUploaded: PegFile | undefined = undefined;
    if (data.imageModified && data.productCategory.image?.file) {
      imageUploaded = await apiUploadFile(data.productCategory.image.file);
    }
    const {
      updateProductCategory,
    }: { updateProductCategory: ProductCategory } = await unwrapData(
      // Le backend GraphQL attend les relations (`parent`, `image`) sous forme
      // d'identifiants (string/id) et non d'objets ; on caste le payload écrit.
      apiUpdateProductCategory({
        ...data.productCategory,
        image: data.imageModified ? (imageUploaded?.id ?? null) : undefined,
      } as unknown as Partial<ProductCategory>)
    );
    return updateProductCategory;
  }
);

export const getProductsByCategory = createAsyncThunk(
  SLICE_NAME + '/getProductsByCategory',
  async (data: GetProductsByCategoryRequest) => {
    const {
      products_connection,
    }: { products_connection: GetProductsResponse } = await unwrapData(
      // Vue admin : requête NON filtrée sur active/inCatalogue — l'admin doit
      // voir tous les produits de la catégorie, y compris ceux invisibles
      // côté client
      apiGetAdminProductsByCategory(data)
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
    setProductCategory(
      state,
      action: PayloadAction<ProductCategory | undefined>
    ) {
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategory = action.payload as any;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getProductCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getProductCategories.fulfilled, (state, action) => {
      state.loading = false;
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategories = action.payload.nodes as any;
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategories.push(action.payload as any);
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategories = (
        state.productCategories as unknown as ProductCategory[]
      ).filter(
        (productCategory) =>
          productCategory.documentId !== action.payload.documentId
      ) as any;
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.products = action.payload.nodes as any;
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
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategory = action.payload.productCategory as any;
    });
    builder.addCase(getProductCategoryById.rejected, (state) => {
      state.loading = false;
    });

    // UPDATE PRODUCT CATEGORY (pas de loading global pour ne pas bloquer la page lors de la sauvegarde d'ordre)
    builder.addCase(updateProductCategory.fulfilled, (state, action) => {
      // TS2589 (limite compilateur Immer/WritableDraft) — runtime correct
      state.productCategories = (
        state.productCategories as unknown as ProductCategory[]
      ).map((productCategory) =>
        productCategory.documentId === action.payload.documentId
          ? action.payload
          : productCategory
      ) as any;
    });
  },
});

export const {
  setModalDeleteProductCategoryOpen,
  setModalDeleteProductCategoryClose,
  setProductCategory,
} = productCategoriesSlice.actions;

export default productCategoriesSlice.reducer;
