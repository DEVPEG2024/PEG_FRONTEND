import { createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import { WritableDraft } from 'immer'

import { IBanner } from '@/@types/banner'
import { apiGetBanners, apiCreateBanner, apiDeleteBanner, apiUpdateBanner, apiUpdateStatusBanner } from '@/services/BannerServices'



export type BannerState = {
    banners: IBanner[]
    total: number
    result: boolean
    message: string
    selectedBanner: IBanner | null
    newBannerDialog: boolean
    editBannerDialog: boolean
    loading: boolean
}
type Query = {
   page: number, pageSize: number, searchTerm: string 
}

type GetBannerListRequest = Query

export const SLICE_NAME = 'banners'

export const getBanners = createAsyncThunk(
    SLICE_NAME + '/getBanners',
    async (data: GetBannerListRequest) => {
        const response = await apiGetBanners(data.page, data.pageSize, data.searchTerm);
        return response.data
    }
)

type CreateBannerRequest = {
        banner: IBanner
}

export const createBanner = createAsyncThunk(
    SLICE_NAME + '/createBanner',
    async (data: CreateBannerRequest) => {
        const response = await apiCreateBanner(data);  
        return response.data    
    }
)       

type DeleteBannerRequest = {
    bannerId: string
}

export const deleteBanner = createAsyncThunk(
    SLICE_NAME + '/deleteBanner',
    async (data: DeleteBannerRequest) => {
        const response = await apiDeleteBanner(data);  
        return response.data.bannerId;
    }
)

type UpdateBannerRequest = {
    banner: IBanner
    bannerId: string
}

export const updateBanner = createAsyncThunk(
        SLICE_NAME + '/updateBanner',
    async (data: UpdateBannerRequest) => {
       const response = await apiUpdateBanner(data);  
        return { banner: response.data.banner, bannerId: data.bannerId };
    }
)

type UpdateStatusBannerRequest = {
    bannerId: string
    status: string
}

export const updateStatusBanner = createAsyncThunk(
    SLICE_NAME + '/updateStatusBanner',
    async (data: UpdateStatusBannerRequest) => {
        await apiUpdateStatusBanner(data);   
        return {status: data.status, bannerId: data.bannerId};
    }
)


const initialState: BannerState = {
    banners: [],
    selectedBanner: null,
    newBannerDialog: false,
    editBannerDialog: false,
    loading: false,
    total: 0,
    result: false,
    message: '',
}


const bannerSlice = createSlice({
    name: `${SLICE_NAME}/state`,
    initialState,
    reducers: {
      
        setNewBannerDialog: (state, action) => {
            state.newBannerDialog = action.payload
        },
        setEditBannerDialog: (state, action) => {
            state.editBannerDialog = action.payload
        },
        setSelectedBanner: (state, action) => {
            state.selectedBanner = action.payload
        },
    },
    extraReducers: (builder) => {
        // GET BANNERS
        builder.addCase(getBanners.pending, (state) => {
            state.loading = true
        })
        builder.addCase(getBanners.fulfilled, (state, action) => {
            state.loading = false
            state.banners = action.payload.banners as unknown as WritableDraft<IBanner>[]
            state.total = action.payload.total
        })
        // CREATE BANNER
        builder.addCase(createBanner.pending, (state) => {
            state.loading = true
        })
        builder.addCase(createBanner.fulfilled, (state, action) => {
            state.loading = false
            state.newBannerDialog = false
            state.banners.push(action.payload.banner as never)
        })  
        builder.addCase(createBanner.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        // UPDATE BANNER
        builder.addCase(updateBanner.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updateBanner.fulfilled, (state, action) => {
            state.loading = false;
            state.editBannerDialog = false;
            state.banners = state.banners.map((banner) =>
                banner._id === action.payload.bannerId
                    ? action.payload.banner
                    : banner   
            ) as WritableDraft<IBanner>[];
        });
        builder.addCase(updateBanner.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        // DELETE BANNER
        builder.addCase(deleteBanner.pending, (state) => {
            state.loading = true
        })
        builder.addCase(deleteBanner.fulfilled, (state, action) => {
            state.loading = false
            state.banners = state.banners.filter(
                (ticket) => ticket._id !== action.payload
            );
        })
        builder.addCase(deleteBanner.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
        builder.addCase(updateStatusBanner.pending, (state) => {
            state.loading = true
        })
        builder.addCase(updateStatusBanner.fulfilled, (state, action) => {
            state.loading = false
            state.banners = state.banners.map((banner) =>
                banner._id === action.payload.bannerId
                    ? { ...banner, status: action.payload.status }
                    : banner
            )
            if(state.selectedBanner?._id === action.payload.bannerId){
                state.selectedBanner = {
                    ...state.selectedBanner,
                    status: action.payload.status,
                }
            }
        })
        builder.addCase(updateStatusBanner.rejected, (state, action) => {
            state.loading = false
            state.message = action.error.message as string
        })
       
    }
})

export const {
  setNewBannerDialog,
  setEditBannerDialog,
  setSelectedBanner,
} = bannerSlice.actions;

export default bannerSlice.reducer;
