import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import {
  currentChatConversationId,
  isChatConversationId,
  tracedConversationOf,
} from './chatTrace';

/**
 * Clôture du chat après une commande issue d'une offre de l'assistant (26/09/2026).
 *
 * Parcours :
 *   1. PaymentContent crée les order-items (conversation notée par
 *      createOrderItemWithTrace) puis `prepareChatClosing` enregistre la clôture
 *      À VENIR — rien ne s'affiche encore (le paiement peut être annulé) ;
 *   2. paiement réussi : page Success (carte) ou succès du paiement différé →
 *      `announceChatClosing` la marque annoncée et prévient le widget (événement) ;
 *   3. le widget (useChatClosing) demande le remerciement au serveur
 *      (POST /chatbot/closing : JWT + propriété + conversation vérifiés), s'ouvre
 *      tout seul dessus et verrouille la conversation (« Nouvelle question »).
 *
 * Aucune commande issue du chat dans le panier → aucun enregistrement → rien ne se
 * passe (et le widget ne fait aucun appel). Tout accès au stockage est protégé
 * (navigation privée, stockage bloqué).
 */

export type ChatClosingMode = 'card' | 'deferred';
export type ChatClosingPending = {
  v: 1;
  conversationId: string;
  orderItemDocumentIds: string[];
  mode: ChatClosingMode;
  createdAt: number;
  announced: boolean;
};
export type ChatClosingItem = {
  productName: string;
  quantity: number;
  assistantFilled: boolean;
  filesPending: boolean;
};
export type ChatClosingResponse =
  | {
      result: true;
      reply: string;
      conversationId: string;
      order: { items: ChatClosingItem[]; totalHT: number };
    }
  | { result: false; reason: 'not_found' | 'not_customer' };
export const CHAT_CLOSING_EVENT = 'peg:chat-closing';
export type ChatOrderStatsBucket = {
  orders: number;
  items: number;
  revenueHT: number;
  conversations: number;
};
export type ChatOrderStatsResponse = {
  result: true;
  stats: {
    allTime: ChatOrderStatsBucket;
    last30Days: ChatOrderStatsBucket;
    closedConversations: number;
    /** Même mesure que `closedConversations`, sur 30 jours (absent d'un serveur antérieur). */
    closedConversationsLast30Days?: number;
    computedAt: string;
  };
};

export const CHAT_CLOSING_KEY_PREFIX = 'peg_chat_closing_v1:';
export const CHAT_LOCKED_KEY_PREFIX = 'peg_chat_locked_v1:';
/** Au-delà, une clôture annoncée n'est plus proposée (paiement abandonné, onglet oublié). */
export const CHAT_CLOSING_MAX_AGE_MS = 2 * 3600 * 1000;
/** Délai de la demande de remerciement ; au-delà, message de repli local. */
export const CHAT_CLOSING_TIMEOUT_MS = 8_000;

/** Libellés (vouvoiement). */
export const CHAT_CLOSING_FALLBACK =
  "Merci pour votre commande ! Elle est bien enregistrée. Je vous préviens le jour de l'expédition 📦";
export const CHAT_CLOSED_TEXT =
  'Conversation terminée — merci pour votre commande.';
export const CHAT_CLOSED_NEW = 'Nouvelle question';

const DOCUMENT_ID_RE = /^[a-z0-9]{10,40}$/i;

const read = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* stockage bloqué */
  }
};
const remove = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* stockage bloqué */
  }
};

/** Clôture enregistrée pour ce compte (validée ; null si absente ou corrompue). */
export const readChatClosing = (userKey: string): ChatClosingPending | null => {
  const raw = read(CHAT_CLOSING_KEY_PREFIX + userKey);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ChatClosingPending> | null;
    if (!p || p.v !== 1 || !isChatConversationId(p.conversationId)) return null;
    if (p.mode !== 'card' && p.mode !== 'deferred') return null;
    const ids = Array.isArray(p.orderItemDocumentIds)
      ? p.orderItemDocumentIds.filter(
          (id) => typeof id === 'string' && DOCUMENT_ID_RE.test(id)
        )
      : [];
    if (!ids.length || typeof p.createdAt !== 'number') return null;
    return {
      v: 1,
      conversationId: p.conversationId,
      orderItemDocumentIds: ids.slice(0, 30),
      mode: p.mode,
      createdAt: p.createdAt,
      announced: p.announced === true,
    };
  } catch {
    return null;
  }
};

export const clearChatClosing = (userKey: string): void =>
  remove(CHAT_CLOSING_KEY_PREFIX + userKey);

/** Clôture annoncée et récente, à traiter par le widget ; une clôture trop ancienne est effacée. */
export const announcedChatClosing = (
  userKey: string,
  now = Date.now()
): ChatClosingPending | null => {
  const pending = readChatClosing(userKey);
  if (!pending) return null;
  if (now - pending.createdAt > CHAT_CLOSING_MAX_AGE_MS) {
    clearChatClosing(userKey);
    return null;
  }
  return pending.announced ? pending : null;
};

/**
 * Avant le paiement : parmi les articles créés, ceux qui viennent du chat. La
 * conversation retenue est celle ouverte dans le widget si elle en fait partie,
 * sinon la plus représentée. Commande sans article du chat → rien (et une
 * clôture restée en attente d'un paiement abandonné est oubliée).
 */
export const prepareChatClosing = (
  userKey: string,
  orderItemDocumentIds: string[],
  mode: ChatClosingMode
): void => {
  const byConversation = new Map<string, string[]>();
  for (const id of orderItemDocumentIds) {
    const conversationId = id ? tracedConversationOf(id) : null;
    if (!conversationId || !DOCUMENT_ID_RE.test(id)) continue;
    byConversation.set(conversationId, [
      ...(byConversation.get(conversationId) ?? []),
      id,
    ]);
  }
  if (!byConversation.size) {
    clearChatClosing(userKey);
    return;
  }
  const current = currentChatConversationId(userKey);
  let chosen = current && byConversation.has(current) ? current : '';
  if (!chosen) {
    for (const [conversationId, ids] of byConversation) {
      if (!chosen || ids.length > (byConversation.get(chosen)?.length ?? 0))
        chosen = conversationId;
    }
  }
  const pending: ChatClosingPending = {
    v: 1,
    conversationId: chosen,
    orderItemDocumentIds: (byConversation.get(chosen) ?? []).slice(0, 30),
    mode,
    createdAt: Date.now(),
    announced: false,
  };
  write(CHAT_CLOSING_KEY_PREFIX + userKey, JSON.stringify(pending));
};

/**
 * Paiement réussi : la clôture préparée est annoncée au widget. `paidIds` (page
 * Success) = articles réellement payés d'après Stripe ; sans lui, tous.
 */
export const announceChatClosing = (
  userKey: string,
  paidIds?: string[]
): void => {
  const pending = readChatClosing(userKey);
  if (!pending) return;
  const ids = paidIds
    ? pending.orderItemDocumentIds.filter((id) => paidIds.includes(id))
    : pending.orderItemDocumentIds;
  if (!ids.length) {
    clearChatClosing(userKey);
    return;
  }
  write(
    CHAT_CLOSING_KEY_PREFIX + userKey,
    JSON.stringify({ ...pending, orderItemDocumentIds: ids, announced: true })
  );
  try {
    window.dispatchEvent(new CustomEvent(CHAT_CLOSING_EVENT));
  } catch {
    /* hors navigateur */
  }
};

// ── Conversation verrouillée ─────────────────────────────────────────────────

export const lockedChatConversation = (userKey: string): string | null => {
  const v = read(CHAT_LOCKED_KEY_PREFIX + userKey);
  return isChatConversationId(v) ? v : null;
};
export const lockChatConversation = (
  userKey: string,
  conversationId: string
): void => write(CHAT_LOCKED_KEY_PREFIX + userKey, conversationId);
export const unlockChatConversation = (userKey: string): void =>
  remove(CHAT_LOCKED_KEY_PREFIX + userKey);

// ── Demande du remerciement ──────────────────────────────────────────────────

/**
 * `reply` : texte du serveur ; `none` : rien à afficher (article introuvable, route
 * absente — front déployé avant le back —, session refusée) ; `fallback` : serveur
 * injoignable, en erreur ou trop lent → remerciement local.
 * `fetch` direct (pas ApiService) : un 401 ne doit jamais déconnecter le client.
 */
export type ChatClosingOutcome =
  | { kind: 'reply'; reply: string; conversationId: string }
  | { kind: 'none' }
  | { kind: 'fallback' };

export const requestChatClosing = async (
  pending: ChatClosingPending,
  token: string | null
): Promise<ChatClosingOutcome> => {
  if (!token) return { kind: 'none' };
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), CHAT_CLOSING_TIMEOUT_MS);
  try {
    const res = await fetch(`${EXPRESS_BACKEND_URL}/chatbot/closing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId: pending.conversationId,
        orderItemDocumentIds: pending.orderItemDocumentIds,
        mode: pending.mode,
      }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (res.status >= 500) return { kind: 'fallback' };
    if (!res.ok) return { kind: 'none' };
    const data = (await res
      .json()
      .catch(() => null)) as ChatClosingResponse | null;
    if (
      data?.result === true &&
      typeof data.reply === 'string' &&
      data.reply.trim()
    ) {
      return {
        kind: 'reply',
        reply: data.reply.trim(),
        conversationId: isChatConversationId(data.conversationId)
          ? data.conversationId
          : pending.conversationId,
      };
    }
    return { kind: 'none' };
  } catch {
    return { kind: 'fallback' };
  } finally {
    clearTimeout(timer);
  }
};
