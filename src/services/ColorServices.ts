import { API_GRAPHQL_URL } from '@/configs/api.config';
import ApiService from './ApiService';
import { Color } from '@/@types/product';
import { AxiosResponse } from 'axios';
import {
  ApiResponse,
  PageInfo,
  PaginationRequest,
} from '@/utils/serviceHelper';

// Fragment commun : champs d'une couleur (catégories multiples + ancien champ pour compat)
const COLOR_FIELDS = `
    documentId
    name
    value
    description
    productCategories {
        documentId
        name
    }
    productCategory {
        documentId
        name
    }
`;

export type GetColorsRequest = {
  pagination: PaginationRequest;
  searchTerm: string;
};

export type GetColorsResponse = {
  nodes: Color[];
  pageInfo: PageInfo;
};

export async function apiGetColors(
  data: GetColorsRequest = {
    pagination: { page: 1, pageSize: 1000 },
    searchTerm: '',
  }
): Promise<
  AxiosResponse<ApiResponse<{ colors_connection: GetColorsResponse }>>
> {
  const query = `
    query GetColors($searchTerm: String, $pagination: PaginationArg) {
        colors_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {${COLOR_FIELDS}}
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
    variables = {
      ...data,
    };
  return ApiService.fetchData<
    ApiResponse<{ colors_connection: GetColorsResponse }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// create color — `productCategories` : liste de documentId (relation multiple)
export type CreateColorRequest = {
  name: string;
  value: string;
  description: string;
  productCategories: string[];
};

export async function apiCreateColor(
  data: CreateColorRequest
): Promise<AxiosResponse<ApiResponse<{ createColor: Color }>>> {
  const query = `
    mutation CreateColor($data: ColorInput!) {
        createColor(data: $data) {${COLOR_FIELDS}}
    }
  `,
    variables = {
      data,
    };
  return ApiService.fetchData<ApiResponse<{ createColor: Color }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// delete color
export type DeleteColorResponse = {
  documentId: string;
};

export async function apiDeleteColor(
  documentId: string
): Promise<AxiosResponse<ApiResponse<{ deleteColor: DeleteColorResponse }>>> {
  const query = `
    mutation DeleteColor($documentId: ID!) {
        deleteColor(documentId: $documentId) {
            documentId
        }
    }
  `,
    variables = {
      documentId,
    };
  return ApiService.fetchData<
    ApiResponse<{ deleteColor: DeleteColorResponse }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// update color
export type UpdateColorRequest = {
  documentId: string;
  name?: string;
  value?: string;
  description?: string;
  productCategories?: string[];
  /**
   * Relation historique (oneToOne). Passer `null` pour la purger : sinon la
   * migration bootstrap de peg_strapi la recopie dans `productCategories` à
   * chaque redémarrage et les retraits de catégories « reviennent ».
   */
  productCategory?: string | null;
};

export async function apiUpdateColor(
  color: UpdateColorRequest
): Promise<AxiosResponse<ApiResponse<{ updateColor: Color }>>> {
  const query = `
    mutation UpdateColor($documentId: ID!, $data: ColorInput!) {
        updateColor(documentId: $documentId, data: $data) {${COLOR_FIELDS}}
    }
  `,
    { documentId, ...data } = color,
    variables = {
      documentId,
      data,
    };
  return ApiService.fetchData<ApiResponse<{ updateColor: Color }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// get colors for specific product category (relation multiple)
export async function apiGetProductCategoryColors(
  productCategoryDocumentId: string
): Promise<AxiosResponse<ApiResponse<{ colors: Color[] }>>> {
  const query = `
    query getProductColors($productCategoryDocumentId: ID!) {
        colors(filters: {productCategories: {documentId: {eq: $productCategoryDocumentId}}}) {${COLOR_FIELDS}}
    }
  `,
    variables = {
      productCategoryDocumentId,
    };

  return ApiService.fetchData<ApiResponse<{ colors: Color[] }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}
