import ApiService from './ApiService'

export async function apiGetMails<T>() {
    return ApiService.fetchData<T>({
        url: '/mails',
        method: 'get',
    })
}


export async function apiGetMail<T, U extends Record<string, unknown>>(
    params: U
) {
    return ApiService.fetchData<T>({
        url: '/mails',
        method: 'get',
        params,
    })
}
