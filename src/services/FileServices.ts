import ApiService from './ApiService'
import { CHANGE_TASK_STATUS_API_URL, DELETE_COMMENT_API_URL, DELETE_FILE_API_URL, DELETE_INVOICES_PROJECT_API_URL, DELETE_PROJECTS_API_URL, DELETE_TASKS_API_URL, GET_INVOICES_PROJECT_API_URL, GET_PROJECTS_API_URL, GET_PROJECTS_CUSTOMER_API_URL, GET_PROJECTS_PRODUCER_API_URL, PAY_PRODUCER_API_URL, POST_COMMENT_API_URL, POST_INVOICES_PROJECT_API_URL, POST_PROJECTS_API_URL, POST_TASKS_API_URL, PUT_INVOICES_PROJECT_API_URL, PUT_PROJECTS_API_URL, PUT_TASKS_API_URL, UPLOAD_FILE_API_URL } from '@/constants/api.constant'
import { FileItem, FileNameBackFront } from '@/@types/file';
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
    const fileId : string = fileName.split('/').pop()?.split('.')[0] as string

    return await fetch(API_BASE_URL + "/upload/delete/" + fileId, {
        method: "DELETE"
    });
}

export async function apiDeleteFiles(filesName: string[]) {
    await Promise.all(filesName.map(fileName => apiDeleteFile(fileName)));
}

export async function apiGetFile(fileNameBack: string, fileNameFront: string): Promise<File> {
    // Récupération de l'image depuis l'URL Cloudinary
    const response = await fetch(fileNameBack, {
        method: "GET"
    });

    // Vérification de la réponse
    if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'image");
    }

    const blob = await response.blob();
    return new File([blob], fileNameFront, { type: blob.type });
}

export async function loadFile(fileName: FileNameBackFront): Promise<File | null> {
    try {
        return await apiGetFile(fileName.fileNameBack, fileName.fileNameFront)
    } catch (error) {
        console.error("Erreur lors de la récupération du fichier :", error);
    }
    return null
};

export async function loadFiles(fileNamesBackFront: FileNameBackFront[]): Promise<FileItem[]> {
    const files: FileItem[] = []
    for (const fileNameBackFront of fileNamesBackFront) {
        const file = await loadFile(fileNameBackFront)
        if (file) {
            files.push({ fileNameBackFront, file })
        }
    }
    return files
}