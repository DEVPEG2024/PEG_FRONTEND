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