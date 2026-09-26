import { useCallback, useRef, useState } from 'react';
import type { ChatOffer } from '@/components/template/chatOffer';
import {
  ChatFormChannel,
  answersForMessage,
  attachAskOf,
  recapOfferOf,
  type ChatFormRequestFields,
} from './chatForm';
import type {
  ChatFormAnswer,
  ChatFormAsk,
  ChatFormDraft,
  ChatFormInput,
  ChatFormTurn,
} from './chatFormTypes';

type FormMessage = {
  role: string;
  error?: boolean;
  form?: unknown;
  offer?: ChatOffer;
};

export type UseChatForm = {
  /** Brouillon de la conversation courante (null = aucune personnalisation en cours). */
  draft: ChatFormDraft | null;
  /** `formDraft` / `formInput` à ajouter au corps de la requête (clic consommé). */
  requestFields: () => ChatFormRequestFields;
  /** `form` de la réponse : brouillon mis à jour, tour à afficher (ou undefined). */
  acceptTurn: (raw: unknown) => ChatFormTurn | undefined;
  /** Offre `<id>-perso` d'un récapitulatif (bouton « Ajouter au panier »). */
  recapOffer: (turn: ChatFormTurn | null | undefined) => ChatOffer | undefined;
  /** Réponses remplies dans le chat pour l'offre d'un message, par produit. */
  answersFor: (msg: FormMessage) => Record<string, ChatFormAnswer> | undefined;
  /** Une offre du chat a changé d'état (ajoutée au panier, envoyée vers la fiche). */
  onOfferChange: (offer: ChatOffer) => void;
  /** Clic : le texte part comme message du client, l'action structurée avec lui. */
  act: (input: ChatFormInput, text: string) => boolean;
  /** Trombone dans la zone de saisie : le dernier message demande un fichier. */
  canAttach: boolean;
  attachAsk: ChatFormAsk | null;
};

/**
 * Personnalisation guidée dans le widget : brouillon PAR conversation
 * (sessionStorage `peg_chat_form_v1:<conversationId>`), renvoyé à chaque
 * message et revalidé par le serveur. « Nouvelle conversation » (nouvel id)
 * repart sans brouillon.
 */
export function useChatForm(o: {
  conversationId: string;
  messages: FormMessage[];
  send: (text: string) => unknown;
}): UseChatForm {
  const channelRef = useRef<ChatFormChannel | null>(null);
  if (!channelRef.current)
    channelRef.current = new ChatFormChannel(o.conversationId);
  const channel = channelRef.current;
  // Changement de conversation : relu pendant le rendu (idempotent) pour qu'aucun
  // envoi ne parte avec le brouillon de la conversation précédente.
  channel.switchTo(o.conversationId);

  const [, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const sendRef = useRef(o.send);
  sendRef.current = o.send;

  const acceptTurn = useCallback(
    (raw: unknown) => {
      const turn = channel.accept(raw);
      refresh();
      return turn;
    },
    [channel, refresh]
  );

  const onOfferChange = useCallback(
    (offer: ChatOffer) => {
      if (channel.offerChanged(offer)) refresh();
    },
    [channel, refresh]
  );

  const act = useCallback(
    (input: ChatFormInput, text: string) => {
      channel.queue(input);
      // L'envoi construit sa requête tout de suite (synchrone) et consomme le clic.
      void sendRef.current(text);
      // Envoi refusé (requête déjà en cours) : le clic n'est pas rejoué plus tard.
      return !channel.cancelQueued();
    },
    [channel]
  );

  const attachAsk = attachAskOf(o.messages, channel.draft);

  return {
    draft: channel.draft,
    requestFields: () => channel.requestFields(),
    acceptTurn,
    recapOffer: recapOfferOf,
    answersFor: answersForMessage,
    onOfferChange,
    act,
    canAttach: !!attachAsk,
    attachAsk,
  };
}
