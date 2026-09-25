import ApiService from './ApiService';
import type {
  GetProjectShippingResponse,
  MarkProjectShippedRequest,
  MarkProjectShippedResponse,
  ProjectShipping,
} from '@/@types/shipping';

/**
 * Expédition d'un projet — route REST dédiée de Strapi (jamais GraphQL : un champ
 * inconnu y ferait échouer toute la requête tant que le serveur n'est pas déployé).
 * Backend : peg_strapi `src/services/shipping.service.ts`.
 * Le serveur ne répond 401 que pour un jeton absent/invalide (ApiService
 * déconnecte sur 401) ; un refus = 403, le projet d'autrui = 404.
 */
const path = (documentId: string) =>
  `/shipping/projects/${encodeURIComponent(documentId)}`;

export const apiGetProjectShipping = (documentId: string) =>
  ApiService.fetchData<GetProjectShippingResponse>({
    url: path(documentId),
    method: 'get',
  });

export const apiMarkProjectShipped = (
  documentId: string,
  data: MarkProjectShippedRequest
) =>
  ApiService.fetchData<MarkProjectShippedResponse, MarkProjectShippedRequest>({
    url: path(documentId),
    method: 'post',
    data,
  });

export const apiCancelProjectShipping = (documentId: string) =>
  ApiService.fetchData<{ result: true; shipping: ProjectShipping }>({
    url: path(documentId),
    method: 'delete',
  });
