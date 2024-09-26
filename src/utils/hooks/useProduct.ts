import { apiGetProducts, apiDeleteProduct} from '@/services/ProductServices'

export default function useProduct() {
    const getProducts = async (page: number, pageSize: number, searchTerm: string) => {
        try {   
            const resp = await apiGetProducts(page, pageSize, searchTerm)
            const total = resp.data.total
            const products = resp.data.products 
            const categories = resp.data.categories
            const stores = resp.data.stores
            return {data: products, total: total, categories: categories, stores: stores}
        } catch (errors: any) {
            return {
                status: 'failed',
                message: errors?.response?.data?.message || errors.toString(),
            }
        }
    }
    return {
        getProducts,
    }
}

export const deleteProduct = async (id: string) => {
    try {
        const resp = await apiDeleteProduct(id)
        return {data: resp.data, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}
