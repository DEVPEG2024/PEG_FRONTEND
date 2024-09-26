import { apiGetCategoriesCustomers } from '@/services/CustomerServices'

export default function useCategoryCustomer() {
    const getCategoriesCustomers = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetCategoriesCustomers(page, pageSize, searchTerm)
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
        getCategoriesCustomers,
    }
}

