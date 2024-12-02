import { apiCreateProject, apiUpdateProjectOld } from '@/services/ProjectServices'

export const createProject = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiCreateProject(data)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}

export const updateProject = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiUpdateProjectOld(data)
        return {data: resp.data.project, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
