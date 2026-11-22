import { API_GRAPHQL_URL } from '@/configs/api.config';
import ApiService from './ApiService';

/**
 * Cartes du catalogue Master Print (22/11/2026) : photo, prix de vente et état
 * des fiches PEG déjà importées, lus en une requête GraphQL (admin). Master
 * Print ne fournit ni photo ni prix dans sa liste : un produit non importé a
 * l'illustration de sa famille. Règles : utils/masterPrintCards.ts.
 */
export type PegCardProduct = {
  documentId: string;
  name: string;
  price: number | null;
  priceTiers: Array<{ minQuantity?: number; price?: number }> | null;
  active: boolean | null;
  inCatalogue: boolean | null;
  images: Array<{
    url: string;
    formats?: Record<string, { url?: string }> | null;
  }> | null;
};

const QUERY = `
  query masterPrintCards($ids: [ID], $limit: Int) {
    products(filters: { documentId: { in: $ids } }, pagination: { limit: $limit }) {
      documentId
      name
      price
      priceTiers
      active
      inCatalogue
      images {
        url
        formats
      }
    }
  }
`;

export const apiGetPegCardProducts = (ids: string[]) =>
  ApiService.fetchData<{
    data?: { products?: PegCardProduct[] };
    errors?: unknown;
  }>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query: QUERY, variables: { ids, limit: ids.length } },
  });
