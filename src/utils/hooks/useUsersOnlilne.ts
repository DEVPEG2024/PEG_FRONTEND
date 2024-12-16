import { API_BASE_URL } from '@/configs/api.config'
import axios from 'axios'


export const getUsersOnline = async () => {
    try {
        const resp = await axios.get(API_BASE_URL+'/secure/admin/connected-users')
        return {data: resp.data.connectedUsers, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
