import { apiGetInvoicesProject } from '@/services/ProjectServices'


export const useInvoicesProject = async (data: Record<string, unknown>) => {
    try {
        const resp = await apiGetInvoicesProject(data)
        return {data: resp.data.invoices, status: 'success', message: resp.data.message}
    } catch (errors: any) {
        return {status: 'failed', message: errors?.response?.data?.message || errors.toString()}
    }
}


