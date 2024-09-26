import { apiDeleteProject } from '@/services/ProjectServices'

export default function useDeleteProject() {
    const deleteProject = async (id: string) => {
        try {   
            const resp = await apiDeleteProject(id)
            return {status: 'success', message: resp.data.message}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        deleteProject,
    }
}

// export const deleteCategory = async (id: string) => {
//     try {
//         const resp = await apiDeleteCategory(id)
//         return {data: resp.data, status: 'success', message: resp.data.message}
//     } catch (errors: any) {
//         return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
//     }
// }
