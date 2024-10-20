import ApiService from './ApiService'
import { CHANGE_TASK_STATUS_API_URL, DELETE_COMMENT_API_URL, DELETE_FILE_API_URL, DELETE_INVOICES_PROJECT_API_URL, DELETE_PROJECTS_API_URL, DELETE_TASKS_API_URL, GET_INVOICES_PROJECT_API_URL, GET_PROJECTS_API_URL, GET_PROJECTS_CUSTOMER_API_URL, GET_PROJECTS_PRODUCER_API_URL, PAY_PRODUCER_API_URL, POST_COMMENT_API_URL, POST_INVOICES_PROJECT_API_URL, POST_PROJECTS_API_URL, POST_TASKS_API_URL, PUT_INVOICES_PROJECT_API_URL, PUT_PROJECTS_API_URL, PUT_TASKS_API_URL, UPLOAD_FILE_API_URL } from '@/constants/api.constant'
import { API_BASE_URL } from '@/configs/api.config'


export async function apiUploadFile(file: File) {
    const formData = new FormData();
    
    formData.append("file", file);
    
    const response = await fetch(API_BASE_URL + "/upload", {
        method: "POST",
        body: formData,
    });
    
    return await response.json()
}

export async function apiDeleteFile(fileName: string) {
    return await fetch(API_BASE_URL + "/upload/delete/" + fileName, {
        method: "DELETE"
    });
}

export async function apiDeleteFiles(filesName: string[]) {
    await Promise.all(filesName.map(fileName => apiDeleteFile(fileName)));
}

export async function apiGetFile(fileName: string): Promise<File> {
    const response = await fetch(API_BASE_URL + "/upload/" + fileName, {
        method: "GET"
    }),
        blob = await response.blob();
    
    return new File([blob], fileName, { type: blob.type });
}