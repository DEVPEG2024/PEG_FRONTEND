import { AxiosResponse } from "axios";

export type ApiResponse<T> = {
    data: T
  }

export type PaginationRequest = {
  page: number,
  pageSize: number
}

export type PageInfo = {
  page: number,
  pageSize: number,
  pageCount: number,
  total: number
}

export async function unwrapData<T>(promise: Promise<AxiosResponse<ApiResponse<T> & { errors?: { message: string }[] }>>): Promise<T> {
    const response = await promise;
    const errors = (response.data as any).errors;
    const data = response.data.data;
    if (errors?.length) {
        if (data) {
            console.warn('[GraphQL] Réponse partielle :', errors.map((e: any) => e.message).join(', '));
        } else {
            throw new Error(errors[0]?.message ?? 'GraphQL error');
        }
    }
    return data;
}
  