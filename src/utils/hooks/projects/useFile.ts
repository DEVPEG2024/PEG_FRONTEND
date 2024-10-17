import { apiUploadFileToProject, apiDeleteFileFromProject } from '@/services/ProjectServices'


export const uploadNewFileToProject = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUploadFileToProject(data)
        return {data: resp.data.file, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

export const deleteFileFromProject = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiDeleteFileFromProject(data)
        return { status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
