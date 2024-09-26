import { apiUploadFile, apiDeleteFile } from '@/services/ProjectServices'


export const uploadNewFile = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUploadFile(data)
        return {data: resp.data.file, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

export const deleteFile = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiDeleteFile(data)
        return { status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
