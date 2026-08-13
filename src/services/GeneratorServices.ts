// src/services/GeneratorServices.ts
// Programme « Générateur » (apporteur d'affaires) : espace générateur + administration.
//
// ⚠️ Toutes ces routes sont des routes Strapi CUSTOM (`/api/referral/*`) qui
// vérifient elles-mêmes le JWT. On ne passe donc PAS par GraphQL : les rôles
// n'ont aucune permission users-permissions sur les content-types de parrainage.
import ApiService from './ApiService';
import { API_BASE_URL } from '@/configs/api.config';
import type {
    Commission,
    CustomerReferralSpace,
    GeneratorAdminDetail,
    GeneratorAdminRow,
    GeneratorPayout,
    GeneratorSpace,
    ReferralCustomer,
    ReferralSettings,
} from '@/@types/generator';

const REFERRAL_URL = `${API_BASE_URL}/referral`;

// ─────────────────────────────── Public ──────────────────────────────────────

export type ReferralCodeCheck = { valid: boolean; code?: string; name?: string };

/** Vérifie un code de parrainage saisi à l'inscription (aucune authentification) */
export async function apiCheckReferralCode(code: string): Promise<ReferralCodeCheck> {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return { valid: false };
    try {
        const res = await fetch(`${REFERRAL_URL}/code/${encodeURIComponent(clean)}`);
        if (!res.ok) return { valid: false };
        return await res.json();
    } catch (err) {
        console.error('[Generator] Échec vérification du code de parrainage:', err);
        return { valid: false };
    }
}

// ────────────────────────────── Générateur ───────────────────────────────────

/** Espace du générateur connecté : profil, agrégats, commissions, versements, filleuls */
export async function apiGetGeneratorSpace(): Promise<GeneratorSpace> {
    const res = await ApiService.fetchData<GeneratorSpace>({
        url: `${REFERRAL_URL}/me`,
        method: 'get',
    });
    return res.data;
}

// ───────────────────────────── Client parrain ────────────────────────────────

/**
 * Espace parrainage du client connecté : son parrain (lecture seule) et sa
 * propre fiche de parrainage (code, lien, filleuls, commissions, solde).
 * Le périmètre est déduit du JWT côté serveur — aucun identifiant n'est envoyé.
 */
export async function apiGetCustomerReferralSpace(): Promise<CustomerReferralSpace> {
    const res = await ApiService.fetchData<CustomerReferralSpace>({
        url: `${REFERRAL_URL}/customer/me`,
        method: 'get',
    });
    return res.data;
}

// ─────────────────────────────── Admin ───────────────────────────────────────

export async function apiGetReferralSettings(): Promise<ReferralSettings> {
    const res = await ApiService.fetchData<ReferralSettings>({
        url: `${REFERRAL_URL}/admin/settings`,
        method: 'get',
    });
    return res.data;
}

/** Définit le taux de commission par défaut (et les options du programme) */
export async function apiUpdateReferralSettings(
    data: Partial<ReferralSettings>
): Promise<ReferralSettings> {
    const res = await ApiService.fetchData<ReferralSettings>({
        url: `${REFERRAL_URL}/admin/settings`,
        method: 'put',
        data,
    });
    return res.data;
}

export async function apiGetGenerators(): Promise<{
    generators: GeneratorAdminRow[];
    settings: ReferralSettings;
}> {
    const res = await ApiService.fetchData<{
        generators: GeneratorAdminRow[];
        settings: ReferralSettings;
    }>({
        url: `${REFERRAL_URL}/admin/generators`,
        method: 'get',
    });
    return res.data;
}

export async function apiGetGeneratorDetail(documentId: string): Promise<GeneratorAdminDetail> {
    const res = await ApiService.fetchData<GeneratorAdminDetail>({
        url: `${REFERRAL_URL}/admin/generators/${documentId}`,
        method: 'get',
    });
    return res.data;
}

export type CreateGeneratorPayload = {
    name: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    /** Taux personnalisé — laisser vide pour appliquer le taux global */
    commissionRate?: number | string | null;
    phoneNumber?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    payoutDetails?: string;
    notes?: string;
};

export async function apiCreateGenerator(payload: CreateGeneratorPayload): Promise<{
    documentId: string;
    name: string;
    referralCode: string;
    referralLink: string;
    userCreated: boolean;
}> {
    const res = await ApiService.fetchData<{
        documentId: string;
        name: string;
        referralCode: string;
        referralLink: string;
        userCreated: boolean;
    }>({
        url: `${REFERRAL_URL}/admin/generators`,
        method: 'post',
        data: payload,
    });
    return res.data;
}

export async function apiUpdateGenerator(
    documentId: string,
    payload: Partial<CreateGeneratorPayload> & { active?: boolean }
): Promise<void> {
    await ApiService.fetchData({
        url: `${REFERRAL_URL}/admin/generators/${documentId}`,
        method: 'put',
        data: payload,
    });
}

/**
 * Crée ou répare le compte de connexion d'un apporteur d'affaires.
 * Sert quand la fiche a été créée sans email (aucun compte) ou sans mot de
 * passe (mot de passe aléatoire inconnu).
 */
export async function apiSetGeneratorAccount(
    documentId: string,
    payload: { email?: string; password?: string; firstName?: string; lastName?: string }
): Promise<{ created: boolean; email: string }> {
    const res = await ApiService.fetchData<{ created: boolean; email: string }>({
        url: `${REFERRAL_URL}/admin/generators/${documentId}/account`,
        method: 'put',
        data: payload,
    });
    return res.data;
}

export async function apiGetCommissions(params?: {
    status?: string;
    generator?: string;
}): Promise<Commission[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.generator) search.set('generator', params.generator);
    const qs = search.toString();
    const res = await ApiService.fetchData<{ commissions: Commission[] }>({
        url: `${REFERRAL_URL}/admin/commissions${qs ? `?${qs}` : ''}`,
        method: 'get',
    });
    return res.data.commissions;
}

/** Valide, remet en attente ou annule une commission (remboursement / commande annulée) */
export async function apiSetCommissionStatus(
    documentId: string,
    status: 'validated' | 'canceled' | 'pending',
    reason?: string
): Promise<void> {
    await ApiService.fetchData({
        url: `${REFERRAL_URL}/admin/commissions/${documentId}/status`,
        method: 'put',
        data: { status, reason },
    });
}

/** Enregistre un versement : bascule les commissions validées en « payées » */
export async function apiCreateGeneratorPayout(payload: {
    generatorDocumentId: string;
    commissionDocumentIds?: string[];
    method?: 'transfer' | 'cheque' | 'cash' | 'other';
    reference?: string;
    note?: string;
}): Promise<{ payout: GeneratorPayout; commissionsPaid: number; amount: number }> {
    const res = await ApiService.fetchData<{
        payout: GeneratorPayout;
        commissionsPaid: number;
        amount: number;
    }>({
        url: `${REFERRAL_URL}/admin/payouts`,
        method: 'post',
        data: payload,
    });
    return res.data;
}

/** Recherche de clients pour le rattachement manuel */
export async function apiSearchReferralCustomers(q: string): Promise<ReferralCustomer[]> {
    const res = await ApiService.fetchData<{ customers: ReferralCustomer[] }>({
        url: `${REFERRAL_URL}/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`,
        method: 'get',
    });
    return res.data.customers;
}

/** Rattache (ou détache) un filleul à un générateur — modification exceptionnelle */
export async function apiSetCustomerGenerator(
    customerDocumentId: string,
    generatorDocumentId: string | null
): Promise<void> {
    await ApiService.fetchData({
        url: `${REFERRAL_URL}/admin/customers/${customerDocumentId}/generator`,
        method: 'put',
        data: { generatorDocumentId },
    });
}

// ─────────────────────────────── Utilitaires ─────────────────────────────────

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    validated: 'Disponible',
    paid: 'Payée',
    canceled: 'Annulée',
};

export const COMMISSION_STATUS_COLORS: Record<
    string,
    { color: string; bg: string; border: string }
> = {
    pending: { color: '#fbbf24', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)' },
    validated: { color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)' },
    paid: { color: '#6b9eff', bg: 'rgba(47,111,237,0.15)', border: 'rgba(47,111,237,0.35)' },
    canceled: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
};

export const PAYOUT_METHOD_LABELS: Record<string, string> = {
    transfer: 'Virement',
    cheque: 'Chèque',
    cash: 'Espèces',
    other: 'Autre',
};

/** Formatage monétaire homogène sur tout l'espace Générateur */
export const formatEuros = (value: number | undefined | null): string =>
    `${(Number(value) || 0).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} €`;
