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
    if ((response.data as any).errors?.length) {
        throw new Error((response.data as any).errors[0]?.message ?? 'GraphQL error');
    }
    return response.data.data;
}
  