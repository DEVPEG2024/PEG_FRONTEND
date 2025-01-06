import ApiService from './ApiService'
import { API_BASE_URL } from '@/configs/api.config'
import { Image } from '@/@types/image';

/*export async function apiUploadFileToEntity(file: File, ref: string, refId: string, field: string) {
    const formData = new FormData();
    
    formData.append("files", file);
    formData.append("ref", ref);
    formData.append("refId", refId);
    formData.append("field", field);
    
    const response = await ApiService.fetchData<File[]>({
        url: API_BASE_URL + "/upload",
        method: 'post',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: formData
    })
    
    return response.data
}*/

export async function apiUploadFile(file: File): Promise<Image> {
    const formData = new FormData();
    
    formData.append("files", file);
    
    const response = await ApiService.fetchData<Image[]>({
        url: API_BASE_URL + "/upload",
        method: 'post',
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        data: formData
    })
    
    return response.data[0]
}

export async function apiGetFile(id: string) {    
    const response = await ApiService.fetchData<Image[]>({
        url: API_BASE_URL + "/upload/files/:" + id,
        method: 'get'
    })
    
    return response.data
}

export async function apiGetAllFiles() : Promise<Image[]> {    
    const response = await ApiService.fetchData<Image[]>({
        url: API_BASE_URL + "/upload/files/",
        method: 'get'
    })
    
    return response.data
}

export async function apiGetImages(fileNames: Image[]): Promise<Image[]> {
    const allUploadedFiles : Image[] = await apiGetAllFiles(),
      filesNameToLoadDocumentId : string[] = fileNames.map(({documentId}) => documentId)

    return allUploadedFiles.filter(({documentId}) => filesNameToLoadDocumentId.includes(documentId))
};

export async function apiLoadImagesAndFiles(images: Image[]): Promise<Image[]> {
    const imagesLoaded: Image[] = await apiGetImages(images);
    const imagesWithFile : Image[] = []
    for (const image of imagesLoaded) {
        const imageAsFile : File = await convertImageUrlToFile(image.url, image.name)

        imagesWithFile.push({...image, file: imageAsFile})
    }
    return imagesWithFile
};

const convertImageUrlToFile = async(url: string, fileName: string) : Promise<File> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }

    const blob = await response.blob(),
      file = new File([blob], fileName, { type: blob.type });

    return file; 
}

// TODO: Voir pour mettre en place un cache de l'ensemble des fichiers qui se MAJ quand ajout et delete + permet de faire la conversion de documentId à id
export async function apiDeleteFile(id: string) {    
    const response = await ApiService.fetchData<Image[]>({
        url: API_BASE_URL + "/upload/files/:" + id,
        method: 'delete'
    })
    
    return response.data
}

/*export async function apiUploadFileTest(file: any, ref: string, refId: string, field: string) {
    const formData = new FormData();
    
    formData.append("files", file);
    formData.append("ref", ref);
    formData.append("refId", refId);
    formData.append("field", field);
    
    const response = await fetch(API_BASE_URL + "/upload", {
        method: "POST",
        body: formData,
    });
    
    return await response.json()
}*/

export async function apiDeleteFiles(filesName: string[]) {
    await Promise.all(filesName.map(fileName => apiDeleteFile(fileName)));
}