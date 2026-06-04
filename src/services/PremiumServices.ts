// src/services/PremiumServices.ts
// Parcours "Passer en Premium" (abonnement Stripe mensuel) + suivi admin.
import ApiService from './ApiService';
import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';

// Tarif Premium (HT mensuel) — doit rester aligné avec PREMIUM_PRICE_HT côté backend.
export const PREMIUM_PRICE_HT = 250;

// Engagement minimum de l'abonnement Premium (en mois) — aligné avec le backend.
export const PREMIUM_MIN_MONTHS = 6;

// peg-backend Express (appel direct, pas de credentials) — comme les vues projet.
const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

// Enregistre la preuve d'acceptation du contrat Premium (trace juridique horodatée côté backend).
// Best-effort : on ne bloque pas le paiement si la trace échoue, mais on logge.
export async function apiRecordPremiumContractAcceptance(params: {
  customerId: string;
  customerName?: string;
  email?: string;
  contractVersion: string;
}): Promise<boolean> {
  try {
    const res = await fetch(PEG_BACKEND_URL + '/premium/contract-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch (e) {
    console.error('[Premium] Échec enregistrement acceptation contrat:', e);
    return false;
  }
}

// Date à partir de laquelle la résiliation est possible (fin de l'engagement)
export function premiumCancellableFrom(premiumSince?: string | null): Date | null {
  if (!premiumSince) return null;
  const since = new Date(premiumSince);
  if (isNaN(since.getTime())) return null;
  const d = new Date(since);
  d.setMonth(d.getMonth() + PREMIUM_MIN_MONTHS);
  return d;
}

// True si l'engagement de 6 mois est écoulé (résiliation possible)
export function canCancelPremium(premiumSince?: string | null): boolean {
  const from = premiumCancellableFrom(premiumSince);
  if (!from) return false;
  return Date.now() >= from.getTime();
}

export type PremiumCustomer = {
  documentId: string;
  name: string;
  premium?: boolean;
  premiumProcessed?: boolean;
  premiumSince?: string | null;
  logo?: { url?: string } | null;
  companyInformations?: {
    email?: string;
    phoneNumber?: string;
    city?: string;
  } | null;
};

// Démarre la session Stripe d'abonnement Premium → renvoie l'id de session
export async function apiStartPremiumCheckout(
  customerDocumentId: string,
  token: string
): Promise<{ id: string }> {
  const res = await fetch(API_BASE_URL + '/checkout/premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `${TOKEN_TYPE}${token}` },
    body: JSON.stringify({ customerDocumentId }),
  });
  if (!res.ok) throw new Error('Échec création session premium');
  return res.json();
}

// Résiliation de l'abonnement Premium (arrêt en fin de période)
export async function apiCancelPremium(
  customerDocumentId: string,
  token: string
): Promise<{ ok: boolean }> {
  const res = await fetch(API_BASE_URL + '/checkout/premium/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `${TOKEN_TYPE}${token}` },
    body: JSON.stringify({ customerDocumentId }),
  });
  if (!res.ok) throw new Error('Échec résiliation premium');
  return res.json();
}

// Liste des clients Premium (admin) — GraphQL (fiable en prod, le REST /api/* peut renvoyer 500)
export async function apiGetPremiumCustomers(): Promise<PremiumCustomer[]> {
  const query = `
    query GetPremiumCustomers {
      customers_connection(
        filters: { premium: { eq: true } }
        pagination: { page: 1, pageSize: 1000 }
        sort: ["premiumSince:desc"]
      ) {
        nodes {
          documentId
          name
          premium
          premiumProcessed
          premiumSince
          logo { url }
          companyInformations { email phoneNumber city }
        }
      }
    }
  `;
  const res: any = await ApiService.fetchData({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query },
  });
  if (res?.data?.errors?.length) {
    console.error('[Premium] Erreurs GraphQL apiGetPremiumCustomers:', res.data.errors);
  }
  return res?.data?.data?.customers_connection?.nodes ?? [];
}

// Marque un client Premium comme traité / non traité (offres personnalisées préparées)
export async function apiSetPremiumProcessed(
  documentId: string,
  value: boolean
): Promise<void> {
  const query = `
    mutation SetPremiumProcessed($documentId: ID!, $data: CustomerInput!) {
      updateCustomer(documentId: $documentId, data: $data) {
        documentId
        premiumProcessed
      }
    }
  `;
  await ApiService.fetchData({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { documentId, data: { premiumProcessed: value } } },
  });
}
