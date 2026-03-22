import ApiService from './ApiService'

export type ClientFile = {
  id: number
  documentId: string
  name: string
  category: 'logo' | 'charte' | 'brief' | 'asset' | 'autre'
  file: {
    url: string
    name: string
    mime: string
    size: number
    ext: string
  }
  shared: boolean
  notes?: string
  customer?: { documentId: string; name: string }
  createdAt: string
  updatedAt: string
}

// GET — fichiers d'un client
export const apiGetClientFiles = (customerDocumentId: string) => {
  return ApiService.fetchData<{ data: ClientFile[] }>({
    url: `/client-files?filters[customer][documentId][$eq]=${customerDocumentId}&populate=*&sort=category:asc,name:asc`,
    method: 'get',
  })
}

// GET — fichiers partagés d'un client (pour les producteurs)
export const apiGetSharedClientFiles = (customerDocumentId: string) => {
  return ApiService.fetchData<{ data: ClientFile[] }>({
    url: `/client-files?filters[customer][documentId][$eq]=${customerDocumentId}&filters[shared][$eq]=true&populate=*&sort=category:asc,name:asc`,
    method: 'get',
  })
}

// POST — créer un fichier client (admin/client)
export const apiCreateClientFile = (data: {
  name: string
  category: string
  shared: boolean
  notes?: string
  customer: string // documentId
  fileId: number // ID du fichier uploadé via /upload-single
}) => {
  return ApiService.fetchData({
    url: '/client-files',
    method: 'post',
    data: {
      data: {
        name: data.name,
        category: data.category,
        shared: data.shared,
        notes: data.notes || '',
        customer: data.customer,
        file: data.fileId,
      },
    },
  })
}

// PUT — mettre à jour un fichier client
export const apiUpdateClientFile = (documentId: string, data: Partial<{
  name: string
  category: string
  shared: boolean
  notes: string
  fileId: number
}>) => {
  const payload: any = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.category !== undefined) payload.category = data.category
  if (data.shared !== undefined) payload.shared = data.shared
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.fileId !== undefined) payload.file = data.fileId

  return ApiService.fetchData({
    url: `/client-files/${documentId}`,
    method: 'put',
    data: { data: payload },
  })
}

// DELETE — supprimer un fichier client
export const apiDeleteClientFile = (documentId: string) => {
  return ApiService.fetchData({
    url: `/client-files/${documentId}`,
    method: 'delete',
  })
}

// Upload un fichier vers S3 via Strapi upload plugin
export const apiUploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('files', file)
  return ApiService.fetchData<any>({
    url: '/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
