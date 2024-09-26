import { apiCreateComment, apiDeleteComment } from '@/services/ProjectServices'


export const createComment = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiCreateComment(data)
        return {data: resp.data.comment, file: resp.data.file, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

export const deleteComment = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiDeleteComment(data)
        return { status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
