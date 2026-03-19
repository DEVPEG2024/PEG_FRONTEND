import axios from 'axios'
import { PRINTAI_API_URL } from '@/configs/api.config'

const PrintAIClient = axios.create({
    timeout: 60000,
    baseURL: PRINTAI_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// --- Types ---

export interface PrintAIQuoteRequest {
    product_name: string
    quantity: number
    placements: string[]
    shipping_method: string
}

export interface PrintAIQuoteResponse {
    product: string
    unitPrice: number
    quantity: number
    totalHT: number
    tva: number
    totalTTC: number
    estimatedDelay: string
    productTotal: number
    extraPlacementCost: number
    setupFee: number
    shippingCost: number
    shippingMethod: string
    tvaRate: number
}

export interface PrintAIPricing {
    id: string
    product_name: string
    category: string
    tier1_min: number
    tier1_max: number
    tier1_price: number
    tier2_min: number
    tier2_max: number
    tier2_price: number
    tier3_min: number
    tier3_max: number
    tier3_price: number
    tier4_min: number
    tier4_max: number
    tier4_price: number
    tier5_min: number
    tier5_max: number
    tier5_price: number
    setup_fee: number
    extra_placement_unit: number
    extra_placement_setup: number
}

export interface PrintAIOrder {
    id?: string
    created_date?: string
    product: string
    quantity: number
    color: string
    placements: string[]
    technique: string
    client_name: string
    client_email: string
    client_phone?: string
    client_company?: string
    client_address: string
    delivery_notes?: string
    unit_price: number
    setup_fee: number
    shipping_cost: number
    shipping_method: string
    total_ht: number
    total_ttc: number
    estimated_delay: string
    status: string
    conversation?: string
    logo_url?: string
}

export interface PrintAICompany {
    id: string
    company_name: string
    address: string
    email: string
    phone: string
    siret: string
    tva_rate: number
}

// --- Chat IA ---

export async function apiPrintAIChat(prompt: string) {
    return PrintAIClient.post<{ text: string }>('/api/llm', { prompt })
}

// --- Calcul devis ---

export async function apiPrintAICalculateQuote(data: PrintAIQuoteRequest) {
    return PrintAIClient.post<PrintAIQuoteResponse>('/api/pdf/calculate', data)
}

// --- Tarifs ---

export async function apiPrintAIGetPricing() {
    return PrintAIClient.get<PrintAIPricing[]>('/api/pricing')
}

export async function apiPrintAICreatePricing(data: Omit<PrintAIPricing, 'id'>) {
    return PrintAIClient.post<PrintAIPricing>('/api/pricing', data)
}

export async function apiPrintAIUpdatePricing(id: string, data: Partial<PrintAIPricing>) {
    return PrintAIClient.put<PrintAIPricing>(`/api/pricing/${id}`, data)
}

export async function apiPrintAIDeletePricing(id: string) {
    return PrintAIClient.delete(`/api/pricing/${id}`)
}

// --- Commandes ---

export async function apiPrintAIGetOrders() {
    return PrintAIClient.get<PrintAIOrder[]>('/api/orders')
}

export async function apiPrintAIGetOrder(id: string) {
    return PrintAIClient.get<PrintAIOrder>(`/api/orders/${id}`)
}

export async function apiPrintAICreateOrder(data: Omit<PrintAIOrder, 'id' | 'created_date'>) {
    return PrintAIClient.post<PrintAIOrder>('/api/orders', data)
}

export async function apiPrintAIUpdateOrder(id: string, data: Partial<PrintAIOrder>) {
    return PrintAIClient.put<PrintAIOrder>(`/api/orders/${id}`, data)
}

export async function apiPrintAIDeleteOrder(id: string) {
    return PrintAIClient.delete(`/api/orders/${id}`)
}

// --- Entreprise ---

export async function apiPrintAIGetCompany() {
    return PrintAIClient.get<PrintAICompany[]>('/api/company')
}

export async function apiPrintAIUpdateCompany(id: string, data: Partial<PrintAICompany>) {
    return PrintAIClient.put<PrintAICompany>(`/api/company/${id}`, data)
}

// --- Health ---

export async function apiPrintAIHealth() {
    return PrintAIClient.get<{ status: string; version: string; model: string }>('/api/health')
}
