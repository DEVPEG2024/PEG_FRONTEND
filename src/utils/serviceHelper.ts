import { AxiosResponse } from "axios";

export type ApiResponse<T> = {
    data: T
  }

export type PageInfo = {
  page: number,
  pageSize: number,
  pageCount: number,
  total: number
}

export async function unwrapData<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
    const response = await promise;

    return response.data.data;
}
  