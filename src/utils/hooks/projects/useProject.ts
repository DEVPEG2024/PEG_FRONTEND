import {  apiGetProjects } from '@/services/ProjectServices'

export default function useProject() {
    const getProjects = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetProjects(page, pageSize, searchTerm)
            const total = resp.data.total
            return {data: resp.data.projects, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getProjects,
    }
}
