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

export async function apiUploadFile(file: File): Promise<PegFile> {
    const formData = new FormData();

    formData.append("file", file);

    const response = await ApiService.fetchData<PegFile | PegFile[]>({
        url: API_BASE_URL + "/upload-single",
        method: 'post',
        data: formData,
        headers: {
            // Supprimer le Content-Type par défaut (application/json) pour que
            // le navigateur définisse automatiquement multipart/form-data avec le boundary
            'Content-Type': undefined,
        },
    })

    return Array.isArray(response.data) ? response.data[0] : response.data
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