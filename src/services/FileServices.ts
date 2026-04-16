import ApiService from './ApiService'
import { API_BASE_URL } from '@/configs/api.config'
import { PegFile } from '@/@types/pegFile';

/*export async function apiUploadFileToEntity(file: File, ref: string, refId: string, field: string) {
    const formData = new FormData();
    
    formData.append("file", file);
    formData.append("ref", ref);
    formData.append("refId", refId);
    formData.append("field", field);
    
    const response = await ApiService.fetchData<File[]>({
        url: API_BASE_URL + "/upload-single",
        method: 'post',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: formData
    })
    
    return response.data
}*/

// Seuil au-delà duquel on utilise l'upload direct S3 (presigned URL)
// pour éviter le timeout Heroku de 30s
const DIRECT_S3_THRESHOLD = 5 * 1024 * 1024; // 5 Mo

export async function apiUploadFile(file: File): Promise<PegFile> {
    if (file.size > DIRECT_S3_THRESHOLD) {
        return apiUploadFileDirect(file);
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await ApiService.fetchData<PegFile | PegFile[]>({
        url: API_BASE_URL + "/upload-single",
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': undefined,
        },
    })

    return Array.isArray(response.data) ? response.data[0] : response.data
}

/**
 * Upload direct vers S3 via presigned URL (contourne le timeout Heroku)
 * 1. Demande une URL signée à Strapi
 * 2. Envoie le fichier directement à S3
 * 3. Enregistre le fichier dans la BDD Strapi
 */
async function apiUploadFileDirect(file: File): Promise<PegFile> {
    // Step 1: get presigned URL
    const presignRes = await ApiService.fetchData<{ presignedUrl: string; s3Key: string }>({
        url: API_BASE_URL + "/upload-single/presigned-url",
        method: 'post',
        data: { fileName: file.name, contentType: file.type },
    });
    const { presignedUrl, s3Key } = presignRes.data;

    // Step 2: upload directly to S3 (raw fetch — pas Axios pour éviter les headers auth)
    const s3Response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
    });
    if (!s3Response.ok) {
        throw new Error(`Upload S3 échoué: ${s3Response.status} ${s3Response.statusText}`);
    }

    // Step 3: register file in Strapi DB
    const registerRes = await ApiService.fetchData<PegFile>({
        url: API_BASE_URL + "/upload-single/register",
        method: 'post',
        data: { s3Key, fileName: file.name, contentType: file.type, size: file.size },
    });

    return registerRes.data;
}

export async function apiGetFile(documentId: string): Promise<PegFile[]> {
    const response = await ApiService.fetchData<PegFile[] | { data: PegFile[] }>({
        url: API_BASE_URL + "/upload/files?filters[documentId][$eq]=" + documentId,
        method: 'get'
    })

    // Strapi v5 returns { data: [...], meta: {...} }, v4 returns a flat array
    if (Array.isArray(response.data)) {
        return response.data
    }
    return (response.data as { data: PegFile[] }).data ?? []
}

export async function apiGetAllFiles() : Promise<PegFile[]> {    
    const response = await ApiService.fetchData<PegFile | PegFile[]>({
        url: API_BASE_URL + "/upload/files/",
        method: 'get'
    })
    
    return response.data
}

export async function apiGetPegFiles(pegFiles: PegFile[]): Promise<PegFile[]> {
    const pegFilesToLoadDocumentId : string[] = pegFiles.map(({documentId}) => documentId)

    return (await Promise.all(pegFilesToLoadDocumentId.map(async (documentId) => await apiGetFile(documentId)))).flat()
};

export async function apiLoadPegFilesAndFiles(pegFiles: PegFile[]): Promise<PegFile[]> {
    const pegFilesLoaded: PegFile[] = await apiGetPegFiles(pegFiles);
    const pegFilesWithFile : PegFile[] = []
    for (const pegFile of pegFilesLoaded) {
        const pegFileAsFile : File = await convertPegFileUrlToFile(pegFile.url, pegFile.name)

        pegFilesWithFile.push({...pegFile, file: pegFileAsFile})
    }
    return pegFilesWithFile
};

const convertPegFileUrlToFile = async(url: string, fileName: string) : Promise<File> => {
    // Cache-buster instead of Cache-Control header to avoid CORS preflight on S3
    const bustUrl = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now()
    const response = await fetch(bustUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch peg file from URL: ${response.statusText}`);
    }

    const blob = await response.blob(),
      file = new File([blob], fileName, { type: blob.type });

    return file; 
}

// TODO: Voir pour mettre en place un cache de l'ensemble des fichiers qui se MAJ quand ajout et delete + permet de faire la conversion de documentId à id
export async function apiDeleteFile(id: string) {    
    const response = await ApiService.fetchData<PegFile | PegFile[]>({
        url: API_BASE_URL + "/upload/files/" + id,
        method: 'delete'
    })
    
    return response.data
}

/*export async function apiUploadFileTest(file: any, ref: string, refId: string, field: string) {
    const formData = new FormData();
    
    formData.append("file", file);
    formData.append("ref", ref);
    formData.append("refId", refId);
    formData.append("field", field);
    
    const response = await fetch(API_BASE_URL + "/upload", {
        method: "POST",
        body: formData,
    });
    
    return await response.json()
}*/

export async function apiDeleteFiles(ids: string[]) {
    await Promise.all(ids.map(id => apiDeleteFile(id)));
}