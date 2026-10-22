/**
 * Suivi « article issu du chat » (26/09/2026) : quand une offre de l'assistant
 * entre au panier, l'article retient la conversation d'où elle vient
 * (`CartItem.chatConversationId`), qui suit ensuite l'order-item. Après le
 * paiement, c'est ce qui permet de conclure CETTE conversation (remerciement dans
 * le chat) et de compter les commandes issues de l'assistant.
 *
 * La conversation est lue AU MOMENT de l'ajout dans la conversation conservée par
 * le widget (`sessionStorage`) : le panier, lui, survit à l'onglet (localStorage),
 * pas la conversation. On ne modifie jamais cette conversation ici (lecture seule).
 */

/** Clé de la conversation du widget (ChatWidget.tsx, `STORAGE_KEY`) — vérifiée par un test. */
export const CHAT_WIDGET_STORAGE_KEY = 'peg_chat_widget_v2';

type UserLike =
  | { documentId?: string | null; id?: string | number | null }
  | null
  | undefined;

/** Même règle que la clé de conversation du widget : documentId, sinon id, sinon « anon ». */
export const chatUserKey = (user: UserLike): string =>
  String(user?.documentId || user?.id || 'anon');

/** Identifiant de conversation accepté par le serveur (sanitizeConversationId). */
export const isChatConversationId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);

type StoredConversation = { conversationId: string; offerIds: Set<string> };

const readStoredConversation = (userKey: string): StoredConversation | null => {
  try {
    const raw = sessionStorage.getItem(`${CHAT_WIDGET_STORAGE_KEY}:${userKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      conversationId?: unknown;
      messages?: unknown;
    };
    if (
      !isChatConversationId(parsed?.conversationId) ||
      !Array.isArray(parsed?.messages)
    )
      return null;
    const offerIds = new Set<string>();
    for (const m of parsed.messages as { offer?: { id?: unknown } }[]) {
      const id = m?.offer?.id;
      if (typeof id === 'string' && id) offerIds.add(id);
    }
    return { conversationId: parsed.conversationId, offerIds };
  } catch {
    return null;
  }
};

/** Conversation courante du widget pour ce compte (null si aucune ou illisible). */
export const currentChatConversationId = (userKey: string): string | null =>
  readStoredConversation(userKey)?.conversationId ?? null;

/**
 * Conversation qui contient l'offre `offerId` (bouton « Ajouter au panier » du
 * chat, fiche pré-remplie, récapitulatif de personnalisation `<id>-perso`).
 * null : offre inconnue (sortie des 40 derniers messages, autre onglet) → pas de suivi.
 */
export const conversationForOffer = (
  offerId: string | null | undefined,
  userKey: string
): string | null => {
  if (!offerId) return null;
  const stored = readStoredConversation(userKey);
  return stored && stored.offerIds.has(offerId) ? stored.conversationId : null;
};

/** Champs à ajouter à l'article du panier : `{ chatConversationId }`, ou rien. */
export const chatTraceFor = (
  offerId: string | null | undefined,
  user: UserLike
): { chatConversationId?: string } => {
  const conversationId = conversationForOffer(offerId, chatUserKey(user));
  return conversationId ? { chatConversationId: conversationId } : {};
};

// ── Articles créés avec leur conversation ────────────────────────────────────
// Noté par createOrderItemWithTrace quand le serveur a ACCEPTÉ le champ, lu juste
// après par prepareChatClosing (même page, même paiement) : la mémoire suffit.
const traced = new Map<string, string>();

export const noteTracedOrderItem = (
  orderItemDocumentId: string,
  conversationId: string
): void => {
  if (orderItemDocumentId && isChatConversationId(conversationId))
    traced.set(orderItemDocumentId, conversationId);
};

export const tracedConversationOf = (
  orderItemDocumentId: string
): string | null => traced.get(orderItemDocumentId) ?? null;
