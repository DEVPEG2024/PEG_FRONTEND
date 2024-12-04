import { apiGetCategoriesProduct } from '@/services/ProductCategoryServices'

export default function useCategoryProduct() {
    const getCategoriesProduct = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetCategoriesProduct(page, pageSize, searchTerm)
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
        getCategoriesProduct,
    }
}

