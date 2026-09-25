import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAT_CLOSING_EVENT,
  CHAT_CLOSING_FALLBACK,
  announcedChatClosing,
  clearChatClosing,
  lockChatConversation,
  lockedChatConversation,
  requestChatClosing,
  unlockChatConversation,
} from './chatClosing';

/** Remerciement à afficher : le widget l'ajoute à la conversation (ou l'ouvre dessus) et s'ouvre. */
export type ChatClosingDelivery = {
  conversationId: string;
  reply: string;
  fallback: boolean;
};

type Options = {
  userKey: string;
  /** Conversation affichée par le widget. */
  conversationId: string;
  token: string | null;
  onClosing: (c: ChatClosingDelivery) => void;
};

/**
 * Côté widget : traite une clôture ANNONCÉE (au montage et sur l'événement
 * `peg:chat-closing`) et dit si la conversation affichée est verrouillée.
 * Sans clôture annoncée, aucun appel réseau. Le verrou tombe dès que la
 * conversation change (« Nouvelle question » = nouvel identifiant).
 */
export function useChatClosing({
  userKey,
  conversationId,
  token,
  onClosing,
}: Options): { locked: boolean } {
  // Verrou lu pour UN compte : après un changement de compte, celui de l'ancien ne compte plus.
  const [lock, setLock] = useState<{ userKey: string; id: string | null }>(
    () => ({ userKey, id: lockedChatConversation(userKey) })
  );
  const lockedId = lock.userKey === userKey ? lock.id : null;
  const onClosingRef = useRef(onClosing);
  onClosingRef.current = onClosing;
  const busyRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // Changement de compte dans l'onglet : verrou du nouveau compte.
  useEffect(() => {
    setLock((prev) =>
      prev.userKey === userKey
        ? prev
        : { userKey, id: lockedChatConversation(userKey) }
    );
  }, [userKey]);

  // Nouvelle conversation : le verrou de l'ancienne est levé (et oublié).
  useEffect(() => {
    if (!lockedId || lockedId === conversationId) return;
    unlockChatConversation(userKey);
    setLock({ userKey, id: null });
  }, [conversationId, lockedId, userKey]);

  const process = useCallback(async () => {
    if (busyRef.current) return;
    const pending = announcedChatClosing(userKey);
    // Jeton pas encore réhydraté (retour de Stripe) : on attendra le rendu suivant.
    if (!pending || !tokenRef.current) return;
    busyRef.current = true;
    try {
      const outcome = await requestChatClosing(pending, tokenRef.current);
      clearChatClosing(userKey);
      if (outcome.kind === 'none') return;
      const delivery: ChatClosingDelivery =
        outcome.kind === 'reply'
          ? {
              conversationId: outcome.conversationId,
              reply: outcome.reply,
              fallback: false,
            }
          : {
              conversationId: pending.conversationId,
              reply: CHAT_CLOSING_FALLBACK,
              fallback: true,
            };
      lockChatConversation(userKey, delivery.conversationId);
      setLock({ userKey, id: delivery.conversationId });
      onClosingRef.current(delivery);
    } finally {
      busyRef.current = false;
    }
  }, [userKey]);

  useEffect(() => {
    void process();
    const handler = () => {
      void process();
    };
    window.addEventListener(CHAT_CLOSING_EVENT, handler);
    return () => window.removeEventListener(CHAT_CLOSING_EVENT, handler);
  }, [process, token]);

  return { locked: !!lockedId && lockedId === conversationId };
}
