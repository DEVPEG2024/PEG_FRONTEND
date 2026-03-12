export type LeadStage = 'nouveau' | 'contacté' | 'qualification' | 'proposition' | 'négociation' | 'gagné' | 'perdu'
export type LeadPriority = 'basse' | 'normale' | 'haute' | 'urgente'
export type LeadSource = 'linkedin' | 'referral' | 'inbound' | 'cold_call' | 'event' | 'site_web' | 'autre'

export type Lead = {
  documentId: string
  company: string
  contact: string
  email: string
  phone: string
  source: LeadSource
  stage: LeadStage
  value: number
  probability: number
  priority: LeadPriority
  notes: string
  nextAction: string
  nextActionDate: string
  createdAt: string
}
