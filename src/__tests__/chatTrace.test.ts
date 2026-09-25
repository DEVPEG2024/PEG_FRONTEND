/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  CHAT_WIDGET_STORAGE_KEY,
  chatTraceFor,
  chatUserKey,
  conversationForOffer,
  currentChatConversationId,
  isChatConversationId,
  noteTracedOrderItem,
  tracedConversationOf,
} from '@/components/template/chat/chatTrace';

// Suivi « article issu du chat » : la conversation est retrouvée, au moment de
// l'ajout au panier, dans la conversation conservée par le widget (sessionStorage).

const CONV = '4f1e2d3c-aaaa-bbbb-cccc-1234567890ab';
const store = (userKey: string, value: unknown) =>
  sessionStorage.setItem(
    `peg_chat_widget_v2:${userKey}`,
    typeof value === 'string' ? value : JSON.stringify(value)
  );

beforeEach(() => sessionStorage.clear());

describe('clé du compte', () => {
  it('documentId, sinon id, sinon « anon » (même règle que le widget)', () => {
    expect(chatUserKey({ documentId: 'u1', id: 7 })).toBe('u1');
    expect(chatUserKey({ id: 7 })).toBe('7');
    expect(chatUserKey(null)).toBe('anon');
    expect(chatUserKey(undefined)).toBe('anon');
  });
  it('clé de la conversation identique à celle du widget (ChatWidget.tsx)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'components/template/ChatWidget.tsx'),
      'utf-8'
    );
    expect(source).toContain(
      `const STORAGE_KEY = '${CHAT_WIDGET_STORAGE_KEY}';`
    );
  });
});

describe('conversation d’une offre', () => {
  const messages = [
    { role: 'user', content: '20 casquettes' },
    {
      role: 'assistant',
      content: 'Total…',
      offer: { id: 'offre-1', lines: [] },
    },
    {
      role: 'assistant',
      content: 'Voici le récapitulatif',
      offer: { id: 'offre-1-perso', lines: [] },
    },
  ];

  it('offre présente dans la conversation stockée → sa conversation', () => {
    store('u1', { conversationId: CONV, messages });
    expect(conversationForOffer('offre-1', 'u1')).toBe(CONV);
    expect(conversationForOffer('offre-1-perso', 'u1')).toBe(CONV);
    expect(chatTraceFor('offre-1', { documentId: 'u1' })).toEqual({
      chatConversationId: CONV,
    });
    expect(currentChatConversationId('u1')).toBe(CONV);
  });
  it('offre absente, autre compte, identifiant vide → aucun suivi', () => {
    store('u1', { conversationId: CONV, messages });
    expect(conversationForOffer('offre-2', 'u1')).toBeNull();
    expect(conversationForOffer('offre-1', 'u2')).toBeNull();
    expect(conversationForOffer(null, 'u1')).toBeNull();
    expect(chatTraceFor('offre-2', { documentId: 'u1' })).toEqual({});
  });
  it('stockage invalide ou identifiant de conversation non conforme → aucun suivi', () => {
    store('u1', '{pas du json');
    expect(conversationForOffer('offre-1', 'u1')).toBeNull();
    store('u1', { conversationId: 'c1', messages });
    expect(conversationForOffer('offre-1', 'u1')).toBeNull();
    store('u1', { conversationId: CONV, messages: 'x' });
    expect(conversationForOffer('offre-1', 'u1')).toBeNull();
    expect(currentChatConversationId('u1')).toBeNull();
  });
  it('stockage bloqué : aucune erreur', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('bloqué');
      });
    expect(conversationForOffer('offre-1', 'u1')).toBeNull();
    spy.mockRestore();
  });
});

describe('articles créés avec leur conversation', () => {
  it('note et relit la paire ; identifiant invalide ignoré', () => {
    noteTracedOrderItem('oi0000000001', CONV);
    noteTracedOrderItem('oi0000000002', 'court');
    expect(tracedConversationOf('oi0000000001')).toBe(CONV);
    expect(tracedConversationOf('oi0000000002')).toBeNull();
    expect(isChatConversationId(CONV)).toBe(true);
    expect(isChatConversationId('a b')).toBe(false);
  });
});
