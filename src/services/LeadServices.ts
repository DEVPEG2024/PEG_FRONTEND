// src/services/LeadServices.ts
import ApiService from './ApiService'
import type { Lead } from '@/@types/lead'

export type GetLeadsRequest = {
  pagination?: { page: number; pageSize: number }
  searchTerm?: string
  stage?: string
}

const buildLeadsQuery = (params: GetLeadsRequest) => {
  const page = params.pagination?.page ?? 1
  const pageSize = params.pagination?.pageSize ?? 100
  const query = new URLSearchParams()
  query.set('pagination[page]', String(page))
  query.set('pagination[pageSize]', String(pageSize))
  query.set('sort[0]', 'createdAt:desc')
  if (params.searchTerm?.trim()) {
    query.set('filters[$or][0][company][$containsi]', params.searchTerm.trim())
    query.set('filters[$or][1][contact][$containsi]', params.searchTerm.trim())
  }
  if (params.stage && params.stage !== 'all') {
    query.set('filters[stage][$eq]', params.stage)
  }
  return query.toString()
}

export const apiGetLeads = (params: GetLeadsRequest = {}) =>
  ApiService.fetchData({
    url: `/leads?${buildLeadsQuery(params)}`,
    method: 'get',
  })

export const apiCreateLead = (data: Omit<Lead, 'documentId' | 'createdAt'>) =>
  ApiService.fetchData({
    url: '/leads',
    method: 'post',
    data: { data },
  })

export const apiUpdateLead = (documentId: string, data: Partial<Omit<Lead, 'documentId' | 'createdAt'>>) =>
  ApiService.fetchData({
    url: `/leads/${documentId}`,
    method: 'put',
    data: { data },
  })

export const apiDeleteLead = (documentId: string) =>
  ApiService.fetchData({
    url: `/leads/${documentId}`,
    method: 'delete',
  })
