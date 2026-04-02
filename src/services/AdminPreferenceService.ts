import BaseService from './BaseService'
import { API_GRAPHQL_URL } from '@/configs/api.config'
import { env } from '@/configs/env.config'

// Fetch admin preference for a user
export async function apiGetAdminPreference(userDocumentId: string) {
  const query = `
    query ($userDocId: String!) {
      adminPreferences(filters: { user: { documentId: { eq: $userDocId } } }) {
        documentId
        todos
        bannerImage { url }
        widgetLayout
      }
    }
  `
  const res = await BaseService.post(API_GRAPHQL_URL, {
    query,
    variables: { userDocId: userDocumentId },
  })
  const prefs = res.data?.data?.adminPreferences?.[0] ?? null
  return prefs
}

// Create admin preference
export async function apiCreateAdminPreference(userDocumentId: string, data: { todos?: any; widgetLayout?: any }) {
  const query = `
    mutation ($data: AdminPreferenceInput!) {
      createAdminPreference(data: $data) { documentId }
    }
  `
  const res = await BaseService.post(API_GRAPHQL_URL, {
    query,
    variables: {
      data: {
        user: userDocumentId,
        todos: data.todos ?? [],
        widgetLayout: data.widgetLayout ?? null,
      },
    },
  })
  return res.data?.data?.createAdminPreference
}

// Update admin preference
export async function apiUpdateAdminPreference(documentId: string, data: { todos?: any; widgetLayout?: any }) {
  const query = `
    mutation ($documentId: ID!, $data: AdminPreferenceInput!) {
      updateAdminPreference(documentId: $documentId, data: $data) { documentId }
    }
  `
  const res = await BaseService.post(API_GRAPHQL_URL, {
    query,
    variables: { documentId, data },
  })
  return res.data?.data?.updateAdminPreference
}

// Upload banner image and link to admin preference
export async function apiUploadBanner(file: File, prefDocumentId: string) {
  const formData = new FormData()
  formData.append('files', file)
  formData.append('ref', 'api::admin-preference.admin-preference')
  formData.append('refId', prefDocumentId)
  formData.append('field', 'bannerImage')

  const res = await BaseService.post(
    (env?.API_ENDPOINT_URL ?? '') + '/api/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}
