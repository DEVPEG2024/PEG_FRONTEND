import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import {
  STYLE_WHEN_UNCHOSEN,
  chatStyleSupported,
  otherChatStyle,
  readChatStyle,
  saveChatStyle,
  subscribeChatServerFeatures,
  type ChatStyle,
} from '@/components/template/chat/chatStyle';

/**
 * Style de réponse de l'assistant pour le compte connecté (cf. chatStyle.ts).
 * Sans compte (`userDocumentId` absent) : jamais choisi, jamais envoyé — le serveur
 * l'ignorerait de toute façon pour un visiteur.
 */
export function useChatStyle(userDocumentId?: string | null): {
  style: ChatStyle | null;
  supported: boolean | null;
  choose(style: ChatStyle): void;
  toggle(): void;
  /** Valeur à envoyer ; si jamais choisi : enregistre 'advice' et le renvoie ; undefined si serveur sans styles. */
  forRequest(): ChatStyle | undefined;
} {
  const id = userDocumentId || null;
  // Choix fait dans cette session : garde la main même si le stockage est bloqué
  // (sinon les boutons d'accueil ne disparaîtraient jamais).
  const [picked, setPicked] = useState<{ id: string; style: ChatStyle } | null>(
    null
  );
  const style = id
    ? picked?.id === id
      ? picked.style
      : readChatStyle(id)
    : null;
  const supported = useSyncExternalStore(
    subscribeChatServerFeatures,
    chatStyleSupported,
    chatStyleSupported
  );

  // Valeurs courantes pour les appels faits hors rendu (envoi d'un message).
  const styleRef = useRef(style);
  styleRef.current = style;
  const idRef = useRef(id);
  idRef.current = id;

  const choose = useCallback((next: ChatStyle) => {
    const current = idRef.current;
    if (!current) return;
    saveChatStyle(current, next);
    styleRef.current = next;
    setPicked({ id: current, style: next });
  }, []);

  const toggle = useCallback(() => {
    choose(otherChatStyle(styleRef.current ?? STYLE_WHEN_UNCHOSEN));
  }, [choose]);

  const forRequest = useCallback((): ChatStyle | undefined => {
    if (!idRef.current || chatStyleSupported() === false) return undefined;
    if (styleRef.current) return styleRef.current;
    // Il écrit sans avoir choisi → Conseil, retenu pour la suite.
    choose(STYLE_WHEN_UNCHOSEN);
    return STYLE_WHEN_UNCHOSEN;
  }, [choose]);

  return { style, supported, choose, toggle, forRequest };
}
