import { API_GRAPHQL_URL } from '@/configs/api.config';
import ApiService from './ApiService';
import { Size } from '@/@types/product';
import { AxiosResponse } from 'axios';
import {
  ApiResponse,
  PageInfo,
  PaginationRequest,
} from '@/utils/serviceHelper';

// Fragment commun : champs d'une taille (catégories multiples + ancien champ pour compat)
const SIZE_FIELDS = `
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

//
export type GetSizesRequest = {
  pagination: PaginationRequest;
  searchTerm: string;
};

export type GetSizesResponse = {
  nodes: Size[];
  pageInfo: PageInfo;
};

export async function apiGetSizes(
  data: GetSizesRequest = {
    pagination: { page: 1, pageSize: 1000 },
    searchTerm: '',
  }
): Promise<AxiosResponse<ApiResponse<{ sizes_connection: GetSizesResponse }>>> {
  const query = `
    query GetSizes($searchTerm: String, $pagination: PaginationArg) {
        sizes_connection (filters: {name: {containsi: $searchTerm}}, pagination: $pagination) {
            nodes {${SIZE_FIELDS}}
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
    ApiResponse<{ sizes_connection: GetSizesResponse }>
  >({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// create size — `productCategories` : liste de documentId (relation multiple)
export type CreateSizeRequest = {
  name: string;
  value: string;
  description: string;
  productCategories: string[];
};

export async function apiCreateSize(
  data: CreateSizeRequest
): Promise<AxiosResponse<ApiResponse<{ createSize: Size }>>> {
  const query = `
    mutation CreateSize($data: SizeInput!) {
        createSize(data: $data) {${SIZE_FIELDS}}
    }
  `,
    variables = {
      data,
    };
  return ApiService.fetchData<ApiResponse<{ createSize: Size }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// delete size
export type DeleteSizeResponse = {
  documentId: string;
};

export async function apiDeleteSize(
  documentId: string
): Promise<AxiosResponse<ApiResponse<{ deleteSize: DeleteSizeResponse }>>> {
  const query = `
    mutation DeleteSize($documentId: ID!) {
        deleteSize(documentId: $documentId) {
            documentId
        }
    }
  `,
    variables = {
      documentId,
    };
  return ApiService.fetchData<ApiResponse<{ deleteSize: DeleteSizeResponse }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// update size
export type UpdateSizeRequest = {
  documentId: string;
  name?: string;
  value?: string;
  description?: string;
  productCategories?: string[];
};

export async function apiUpdateSize(
  size: UpdateSizeRequest
): Promise<AxiosResponse<ApiResponse<{ updateSize: Size }>>> {
  const query = `
    mutation UpdateSize($documentId: ID!, $data: SizeInput!) {
        updateSize(documentId: $documentId, data: $data) {${SIZE_FIELDS}}
    }
  `,
    { documentId, ...data } = size,
    variables = {
      documentId,
      data,
    };
  return ApiService.fetchData<ApiResponse<{ updateSize: Size }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}

// get sizes for specific product category (relation multiple)
export async function apiGetProductCategorySizes(
  productCategoryDocumentId: string,
  pagination: PaginationRequest = { page: 1, pageSize: 1000 }
): Promise<AxiosResponse<ApiResponse<{ sizes: Size[] }>>> {
  const query = `
    query getProductSizes($productCategoryDocumentId: ID!, $pagination: PaginationArg) {
        sizes(filters: {productCategories: {documentId: {eq: $productCategoryDocumentId}}}, pagination: $pagination) {${SIZE_FIELDS}}
    }
  `,
    variables = {
      productCategoryDocumentId,
      pagination,
    };

  return ApiService.fetchData<ApiResponse<{ sizes: Size[] }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: {
      query,
      variables,
    },
  });
}
