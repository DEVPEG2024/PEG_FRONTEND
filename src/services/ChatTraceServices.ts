import type { AxiosError, AxiosResponse } from 'axios';
import ApiService from './ApiService';
import {
  apiCreateOrderItem,
  type CreateOrderItemRequest,
} from './OrderItemServices';
import type { OrderItem } from '@/@types/orderItem';
import type { ApiResponse } from '@/utils/serviceHelper';
import {
  isChatConversationId,
  noteTracedOrderItem,
} from '@/components/template/chat/chatTrace';
import type { ChatOrderStatsResponse } from '@/components/template/chat/chatClosing';

// ─── Article de commande issu du chat (`chatConversationId`) ─────────────────
// Champ ajouté côté Strapi le 26/09/2026. Tant que le backend n'est pas
// redéployé, l'envoyer fait échouer TOUTE la création (champ inconnu → 400) :
// la commande ne partirait pas. On l'envoie ; si le serveur ne le connaît pas, on
// rejoue sans lui et on s'en souvient pour la session (même schéma que
// `fetchBannerGraphQL`). Sans le champ, la clôture dans le chat n'a simplement pas lieu.
let conversationFieldSupport: boolean | null = null;

const rejectsConversationField = (payload: unknown): boolean => {
  const errors = (payload as { errors?: { message?: string }[] } | undefined)
    ?.errors;
  return (
    Array.isArray(errors) &&
    errors.some((e) => (e?.message ?? '').includes('chatConversationId'))
  );
};

type CreateOrderItemResponse = AxiosResponse<
  ApiResponse<{ createOrderItem: OrderItem }>
>;

/**
 * `apiCreateOrderItem` + la conversation du chat d'où vient l'article. Même
 * réponse qu'`apiCreateOrderItem` (à passer à `unwrapData`). L'article créé AVEC
 * le champ est noté pour la clôture (`prepareChatClosing`).
 */
export async function createOrderItemWithTrace(
  orderItem: CreateOrderItemRequest,
  chatConversationId?: string | null
): Promise<CreateOrderItemResponse> {
  if (
    !isChatConversationId(chatConversationId) ||
    conversationFieldSupport === false
  ) {
    return apiCreateOrderItem(orderItem);
  }
  const traced: CreateOrderItemRequest & { chatConversationId: string } = {
    ...orderItem,
    chatConversationId,
  };
  try {
    const res = await apiCreateOrderItem(traced);
    if (!rejectsConversationField(res.data)) {
      conversationFieldSupport = true;
      const documentId = res.data?.data?.createOrderItem?.documentId;
      if (documentId) noteTracedOrderItem(documentId, chatConversationId);
      return res;
    }
  } catch (err) {
    if (!rejectsConversationField((err as AxiosError)?.response?.data))
      throw err;
  }
  conversationFieldSupport = false;
  return apiCreateOrderItem(orderItem);
}

// ─── Statistiques de l'assistant (admin) ─────────────────────────────────────
export const apiGetChatOrderStats = () =>
  ApiService.fetchData<ChatOrderStatsResponse>({
    url: '/chatbot/stats/orders',
    method: 'get',
  });
