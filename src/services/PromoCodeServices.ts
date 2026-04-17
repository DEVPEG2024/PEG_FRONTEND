import { API_BASE_URL, API_GRAPHQL_URL } from '@/configs/api.config';
import ApiService from './ApiService';
import { PromoCode, PromoCodeValidation } from '@/@types/promoCode';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';

// ============================================================
// Validation (customer-facing)
// ============================================================

export async function apiValidatePromoCode(
  code: string,
  subtotalHT: number
): Promise<PromoCodeValidation> {
  const res = await ApiService.fetchData<PromoCodeValidation>({
    url: API_BASE_URL + '/promo-codes/validate',
    method: 'post',
    data: { code, subtotalHT },
  });
  return res.data;
}

// ============================================================
// Admin CRUD (GraphQL)
// ============================================================

export type GetPromoCodesRequest = {
  pagination: PaginationRequest;
  searchTerm: string;
};

export type GetPromoCodesResponse = {
  nodes: PromoCode[];
  pageInfo: PageInfo;
};

export async function apiGetPromoCodes(
  data: GetPromoCodesRequest = { pagination: { page: 1, pageSize: 100 }, searchTerm: '' }
): Promise<AxiosResponse<ApiResponse<{ promoCodes_connection: GetPromoCodesResponse }>>> {
  const query = `
    query GetPromoCodes($searchTerm: String, $pagination: PaginationArg) {
      promoCodes_connection(
        filters: { code: { containsi: $searchTerm } }
        pagination: $pagination
        sort: "createdAt:desc"
      ) {
        nodes {
          documentId
          code
          discountType
          discountValue
          validFrom
          validUntil
          minOrderAmount
          active
        }
        pageInfo {
          page
          pageCount
          pageSize
          total
        }
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ promoCodes_connection: GetPromoCodesResponse }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: data },
  });
}

export async function apiCreatePromoCode(
  input: Omit<PromoCode, 'documentId'>
): Promise<AxiosResponse<ApiResponse<{ createPromoCode: PromoCode }>>> {
  const mutation = `
    mutation CreatePromoCode($data: PromoCodeInput!) {
      createPromoCode(data: $data) {
        documentId
        code
        discountType
        discountValue
        validFrom
        validUntil
        minOrderAmount
        active
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ createPromoCode: PromoCode }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query: mutation, variables: { data: input } },
  });
}

export async function apiUpdatePromoCode(
  documentId: string,
  input: Partial<Omit<PromoCode, 'documentId'>>
): Promise<AxiosResponse<ApiResponse<{ updatePromoCode: PromoCode }>>> {
  const mutation = `
    mutation UpdatePromoCode($documentId: ID!, $data: PromoCodeInput!) {
      updatePromoCode(documentId: $documentId, data: $data) {
        documentId
        code
        discountType
        discountValue
        validFrom
        validUntil
        minOrderAmount
        active
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ updatePromoCode: PromoCode }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query: mutation, variables: { documentId, data: input } },
  });
}

export async function apiDeletePromoCode(
  documentId: string
): Promise<AxiosResponse<ApiResponse<{ deletePromoCode: { documentId: string } }>>> {
  const mutation = `
    mutation DeletePromoCode($documentId: ID!) {
      deletePromoCode(documentId: $documentId) {
        documentId
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ deletePromoCode: { documentId: string } }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query: mutation, variables: { documentId } },
  });
}
