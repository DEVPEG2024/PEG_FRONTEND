import { apiGetCategoriesProducers } from '@/services/ProducerServices'

export default function useCategoryProducer() {
    const getCategoriesProducers = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetCategoriesProducers(page, pageSize, searchTerm)
            const total = resp.data.total
            return {data: resp.data.categories, total: total}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getCategoriesProducers,
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
