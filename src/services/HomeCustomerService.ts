import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IBanner } from '@/@types/banner';
import { IProduct } from '@/@types/product';


type HomeCustomerResponse = {
  banner: IBanner[]
  products: IProduct[]
  level: number
  message: string
}

export async function apiGetHomeCustomer(id: string) {
  return ApiService.fetchData<HomeCustomerResponse>({
    url: `${API_BASE_URL}/customers/home/${id}`,
    method: "get",
  });
}
