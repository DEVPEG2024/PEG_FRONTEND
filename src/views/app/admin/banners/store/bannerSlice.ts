import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { Banner } from '@/@types/banner';
import {
  apiGetBanners,
  apiCreateBanner,
  apiDeleteBanner,
  apiUpdateBanner,
  GetBannersRequest,
  GetBannersResponse,
  CreateBannerRequest,
  DeleteBannerResponse,
} from '@/services/BannerServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Image } from '@/@types/product';
import { apiUploadFile } from '@/services/FileServices';

export const SLICE_NAME = 'banners';

export type BannerState = {
  banners: Banner[];
  total: number;
  selectedBanner: Banner | null;
  newBannerDialog: boolean;
  editBannerDialog: boolean;
  loading: boolean;
};

export const getBanners = createAsyncThunk(
  SLICE_NAME + '/getBanners',
  async (data: GetBannersRequest) : Promise<GetBannersResponse> => {
    const {banners_connection} : {banners_connection: GetBannersResponse} = await unwrapData(apiGetBanners(data));
    return banners_connection;
  }
);

export const createBanner = createAsyncThunk(
  SLICE_NAME + '/createBanner',
  async (data: CreateBannerRequest) : Promise<Banner> => {
    let imageUploaded : Image | undefined = undefined
    if (data.image) {
      imageUploaded = await apiUploadFile(data.image.file)
    }
    const {createBanner} : {createBanner: Banner} = await unwrapData(apiCreateBanner({...data, image: imageUploaded?.id ?? null}));
    return createBanner;
  }
);

export const deleteBanner = createAsyncThunk(
  SLICE_NAME + '/deleteBanner',
  async (documentId: string): Promise<DeleteBannerResponse> => {
    const {deleteBanner} : {deleteBanner: DeleteBannerResponse} = await unwrapData(apiDeleteBanner(documentId));
    return deleteBanner;
  }
);

export type UpdateBanner = {
  banner: Partial<Banner>;
  imageModified: boolean;
}

export const updateBanner = createAsyncThunk(
  SLICE_NAME + '/updateBanner',
  async (data: UpdateBanner): Promise<Banner> => {
    let imageUploaded : Image | undefined = undefined
    if (data.imageModified && data.banner.image) {
      imageUploaded = await apiUploadFile(data.banner.image.file)
    }
    const {updateBanner} : {updateBanner: Banner} = await unwrapData(apiUpdateBanner({...data.banner, image: data.imageModified ? imageUploaded?.id ?? null : undefined}));
    return updateBanner;
  }
);

const initialState: BannerState = {
  banners: [],
  selectedBanner: null,
  newBannerDialog: false,
  editBannerDialog: false,
  loading: false,
  total: 0,
};

const bannerSlice = createSlice({
  name: `${SLICE_NAME}/state`,
  initialState,
  reducers: {
    setNewBannerDialog: (state, action) => {
      state.newBannerDialog = action.payload;
    },
    setEditBannerDialog: (state, action) => {
      state.editBannerDialog = action.payload;
    },
    setSelectedBanner: (state, action) => {
      state.selectedBanner = action.payload;
    },
  },
  extraReducers: (builder) => {
    // GET BANNERS
    builder.addCase(getBanners.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getBanners.fulfilled, (state, action) => {
      state.loading = false;
      state.banners = action.payload.nodes;
      state.total = action.payload.pageInfo.total;
    });
    builder.addCase(getBanners.rejected, (state) => {
      state.loading = false;
    });
    // CREATE BANNER
    builder.addCase(createBanner.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createBanner.fulfilled, (state, action) => {
      state.loading = false;
      state.banners.push(action.payload);
      state.total += 1
    });
    builder.addCase(createBanner.rejected, (state) => {
      state.loading = false;
    });
    // UPDATE BANNER
    builder.addCase(updateBanner.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateBanner.fulfilled, (state, action) => {
      state.loading = false;
      state.banners = state.banners.map((banner) =>
        banner.documentId === action.payload.documentId ? action.payload : banner
      );
    });
    builder.addCase(updateBanner.rejected, (state) => {
      state.loading = false;
    });
    // DELETE BANNER
    builder.addCase(deleteBanner.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteBanner.fulfilled, (state, action) => {
      state.loading = false;
      state.banners = state.banners.filter((banner) => banner.documentId !== action.payload.documentId);
      state.total -= 1
    });
    builder.addCase(deleteBanner.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const { setNewBannerDialog, setEditBannerDialog, setSelectedBanner } =
  bannerSlice.actions;

export default bannerSlice.reducer;
