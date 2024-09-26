import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { ICategory } from '@/@types/user'

export type UserState = {
    _id?: string
    avatar?: string
    firstName?: string
    lastName?: string
    userName?: string
    email?: string
    authority?: string[]
    category?: ICategory
    phone?: string
    address?: string
    city?: string
    zip?: string
    country?: string
    companyName?: string
}

const initialState: UserState = {
    _id: '',
    avatar: '',
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: '',
    authority: [],
    companyName: '',
}

const userSlice = createSlice({
    name: `${SLICE_BASE_NAME}/user`,
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<UserState>) {
            state._id = action.payload?._id
            state.avatar = action.payload?.avatar
            state.firstName = action.payload?.firstName
            state.lastName = action.payload?.lastName
            state.email = action.payload?.email
            state.userName = action.payload?.userName
            state.phone = action.payload?.phone
            state.address = action.payload?.address
            state.city = action.payload?.city
            state.zip = action.payload?.zip
            state.country = action.payload?.country
            state.authority = action.payload?.authority
            state.companyName = action.payload?.companyName
        },
    },
})

export const { setUser } = userSlice.actions
export default userSlice.reducer
