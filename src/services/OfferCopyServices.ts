// Copier les offres d'un client vers un autre (écran admin
// /admin/products/copy-offers). Lectures GraphQL dédiées ; les écritures
// réutilisent apiCreateProduct / apiUpdateProduct.
import ApiService from './ApiService';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { ApiResponse } from '@/utils/serviceHelper';
import { Product } from '@/@types/product';
import { AxiosResponse } from 'axios';

export type CopyClient = {
  documentId: string;
  name: string;
  premium?: boolean | null;
  logo?: { url: string } | null;
};

export async function apiGetCopyClients(): Promise<
  AxiosResponse<ApiResponse<{ customers_connection: { nodes: CopyClient[] } }>>
> {
  const query = `
    query GetCopyClients {
      customers_connection(pagination: { page: 1, pageSize: 1000 }, sort: "name") {
        nodes {
          documentId
          name
          premium
          logo { url }
        }
      }
    }
  `;
  return ApiService.fetchData<
    ApiResponse<{ customers_connection: { nodes: CopyClient[] } }>
  >({ url: API_GRAPHQL_URL, method: 'post', data: { query } });
}

// Offres RÉSERVÉES au client (relation `customers`), avec tout ce qu'une copie
// recopie — mêmes champs que apiGetProductForEditById. Les offres de secteur
// ne sont pas concernées : un client du même secteur les voit déjà.
export async function apiGetClientOwnOffers(
  customerDocumentId: string
): Promise<
  AxiosResponse<ApiResponse<{ products_connection: { nodes: Product[] } }>>
> {
  const query = `
    query GetClientOwnOffers($customerDocumentId: ID!) {
      products_connection(
        filters: { customers: { documentId: { eq: $customerDocumentId } } }
        pagination: { page: 1, pageSize: 200 }
        sort: "name"
      ) {
        nodes {
          documentId
          description
          name
          price
          priceTiers
          pricingMode
          pricePerM2
          minM2
          cost
          images { documentId url name }
          active
          inCatalogue
          sizes { documentId name value }
          colors { documentId name value }
          form { documentId }
          checklist { documentId }
          requiresBat
          catalogPrice
          productRef
          refVisibleToCustomer
          productCategory { documentId name }
        }
      }
    }
  `;
  return ApiService.fetchData<
    ApiResponse<{ products_connection: { nodes: Product[] } }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { customerDocumentId } },
  });
}

// Offres CACHÉES (inactives) réservées au client : l'étape Photos et la
// mention « N offres à publier » de la liste des clients.
export async function apiGetClientHiddenOffers(
  customerDocumentId: string
): Promise<
  AxiosResponse<ApiResponse<{ products_connection: { nodes: Product[] } }>>
> {
  const query = `
    query GetClientHiddenOffers($customerDocumentId: ID!) {
      products_connection(
        filters: {
          customers: { documentId: { eq: $customerDocumentId } }
          active: { eq: false }
        }
        pagination: { page: 1, pageSize: 200 }
        sort: "name"
      ) {
        nodes {
          documentId
          name
          images { documentId url name }
        }
      }
    }
  `;
  return ApiService.fetchData<
    ApiResponse<{ products_connection: { nodes: Product[] } }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { customerDocumentId } },
  });
}

type HiddenOffer = { documentId: string; customers: { documentId: string }[] };

export async function apiGetHiddenOffersClients(): Promise<
  AxiosResponse<ApiResponse<{ products_connection: { nodes: HiddenOffer[] } }>>
> {
  const query = `
    query GetHiddenOffersClients {
      products_connection(
        filters: { active: { eq: false }, customers: { documentId: { notNull: true } } }
        pagination: { page: 1, pageSize: 1000 }
      ) {
        nodes { documentId customers { documentId } }
      }
    }
  `;
  return ApiService.fetchData<
    ApiResponse<{ products_connection: { nodes: HiddenOffer[] } }>
  >({ url: API_GRAPHQL_URL, method: 'post', data: { query } });
}
