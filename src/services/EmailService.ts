import { EMAIL_URL } from '@/configs/api.config'
import ApiService from './ApiService'

export type EmailContent = {
    to: string;
    subject: string;
    body: string;
  };

export async function apiSendEmail(data: EmailContent) {
    return ApiService.fetchData({
        url: `${EMAIL_URL}`,
        method: 'post',
        data
    })
}
