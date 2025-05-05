import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_AVATAR_URL_NAME } from './constants'

export type AvatarUrlState = {
    [documentId: string] : string
}

export const initialState: AvatarUrlState = {}

export const avatarUrlSlice = createSlice({
    name: `${SLICE_AVATAR_URL_NAME}/avatarUrl`,
    initialState,
    reducers: {
        setAvatarUrl: (state, action: PayloadAction<{ documentId: string; url: string }>) => {
            state[action.payload.documentId] = action.payload.url;
          },
    },

})

export const { setAvatarUrl } = avatarUrlSlice.actions

export default avatarUrlSlice.reducer
