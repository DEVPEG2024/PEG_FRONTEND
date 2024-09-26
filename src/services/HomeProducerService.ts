import { API_BASE_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { IProject } from '@/@types/project';
import { IWallet } from '@/@types/user';


type HomeProducerResponse = {
  projects: IProject[]
  level: number
  wallet: IWallet
  message: string
}

export async function apiGetHomeProducer(id: string) {
  return ApiService.fetchData<HomeProducerResponse>({
    url: `${API_BASE_URL}/producers/home/${id}`,
    method: "get",
  });
}
