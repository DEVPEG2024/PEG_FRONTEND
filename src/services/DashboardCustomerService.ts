import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { AxiosResponse } from 'axios';
import { ApiResponse } from '@/utils/serviceHelper';
import { Customer } from '@/@types/customer';
import { fetchBannerGraphQL } from './BannerServices';

export async function apiGetDashboardCustomerInformations(documentId: string): Promise<AxiosResponse<ApiResponse<{customer: Customer}>>> {
  // La bannière porte une image téléphone depuis le 25/09/2026 : fetchBannerGraphQL
  // rejoue la requête sans elle si le backend n'est pas encore redéployé.
  return fetchBannerGraphQL<ApiResponse<{customer: Customer}>>((withMobile) => ({
    query: `
    query DashboardCustomerInformationsQuery($documentId: ID!) {
      customer(documentId: $documentId) {
        documentId
        catalogAccess
        customerCategory {
          documentId
        }
        name
        banner {
          documentId
          image {
            documentId
            url
          }
          ${withMobile ? 'mobileImage { documentId url width height size formats }' : ''}
        }
      }
    }
  `,
    variables: { documentId },
  }))
}

// ─── Contexte de la page « Mes offres » (/customer/products) ────────────────
// `/users/me` ne peuple que les champs simples du client : `customerCategory`
// (relation) y est absent → sans cette requête, les offres rattachées au
// secteur du client ne s'affichaient jamais. On relit donc ici le secteur et
// les drapeaux utiles à la page.
// ⚠️ Ne PAS demander `customerCategory { name }` : le rôle client n'a jamais lu
// ce champ, la permission n'est pas prouvée.
export type CustomerOffersContextCustomer = Pick<
  Customer,
  | 'documentId'
  | 'name'
  | 'catalogAccess'
  | 'premium'
  | 'premiumProcessed'
  | 'premiumSince'
> & { customerCategory?: { documentId: string } | null };

export type CustomerOffersContextResponse = {
  customer: CustomerOffersContextCustomer | null;
};

export async function apiGetCustomerOffersContext(
  documentId: string
): Promise<AxiosResponse<ApiResponse<CustomerOffersContextResponse>>> {
  const query = `
    query CustomerOffersContext($documentId: ID!) {
      customer(documentId: $documentId) {
        documentId
        name
        catalogAccess
        premium
        premiumProcessed
        premiumSince
        customerCategory {
          documentId
        }
      }
    }
  `;

  const response = await ApiService.fetchData<
    ApiResponse<CustomerOffersContextResponse>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables: { documentId },
    },
  });
  const errors = (
    response.data as { errors?: { message?: string }[] } | undefined
  )?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    console.error(
      '[Mes offres] Erreurs GraphQL CustomerOffersContext :',
      errors.map((e) => e?.message).join(', ')
    );
  }
  return response;
}
