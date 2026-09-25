/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatWidget from '@/components/template/ChatWidget';
import { noteTracedOrderItem } from '@/components/template/chat/chatTrace';
import {
  CHAT_CLOSING_FALLBACK,
  CHAT_CLOSING_MAX_AGE_MS,
  announceChatClosing,
  prepareChatClosing,
  readChatClosing,
} from '@/components/template/chat/chatClosing';

// Commande issue d'une offre du chat, payée : le chat s'ouvre TOUT SEUL sur le
// remerciement écrit par le serveur et la conversation est close. Parcours réel du
// widget ; seul le serveur (fetch) est simulé.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = jest.fn();
jest.mock('@/utils/hooks/useResponsive', () => () => ({
  smaller: { md: false },
  larger: { md: true },
}));

const CONV = '4f1e2d3c-aaaa-bbbb-cccc-1234567890ab';
const OTHER = '9a8b7c6d-1111-2222-3333-444455556666';
const OI1 = 'oi0000000001';
const OI2 = 'oi0000000002';
const REPLY =
  "Merci Léa !\nVotre commande est validée : 20 × Casquette brodée — en cours de fabrication.\nJe vous préviens le jour de l'expédition 📦";

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({
        user: () => ({
          user: { documentId: 'u1', firstName: 'Léa', lastName: 'Martin' },
        }),
        session: () => ({ token: 'jwt' }),
      }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }),
  });

const conversation = (conversationId = CONV) => ({
  conversationId,
  messages: [
    { role: 'user', content: '20 casquettes brodées' },
    {
      role: 'assistant',
      content: 'Total : 170 € HT',
      offer: {
        id: 'o1',
        totalHT: 170,
        totalTTC: 204,
        lines: [
          {
            productDocumentId: 'cap',
            productName: 'Casquette brodée',
            quantity: 20,
            totalHT: 160,
          },
        ],
      },
    },
  ],
});

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const okReply = (conversationId = CONV) =>
  json(200, {
    result: true,
    reply: REPLY,
    conversationId,
    order: {
      items: [
        {
          productName: 'Casquette brodée',
          quantity: 20,
          assistantFilled: false,
          filesPending: false,
        },
      ],
      totalHT: 160,
    },
  });

let container: HTMLDivElement;
let root: Root;
const fetchMock = jest.fn();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  fetchMock.mockReset();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = () =>
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/common/projects']}>
          <ChatWidget />
        </MemoryRouter>
      </Provider>
    );
  });
const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
const q = <T extends Element = HTMLButtonElement>(sel: string) =>
  container.querySelector(sel) as T | null;
const bot = () =>
  [...container.querySelectorAll('.pcw-bubble--bot')].map(
    (b) => b.textContent ?? ''
  );
const button = (label: string) =>
  [...container.querySelectorAll('button')].find(
    (b) => (b.textContent ?? '').trim() === label
  ) ?? null;

/** Paiement d'une commande dont un article vient de l'offre du chat (conversation CONV). */
const paidOrder = (paidIds: string[] = [OI1]) => {
  noteTracedOrderItem(OI1, CONV); // noté par createOrderItemWithTrace (serveur à jour)
  prepareChatClosing('u1', [OI1, OI2], 'card'); // OI2 : article ajouté hors du chat
  announceChatClosing('u1', paidIds); // page Success
};

describe('Chat — clôture après une commande issue du chat', () => {
  it('le widget s’ouvre sur la réponse du serveur ; saisie remplacée ; « Nouvelle question » la rend', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockResolvedValue(okReply());
    render();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(q('[role="dialog"]')).toBeNull();

    act(() => paidOrder());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/chatbot\/closing$/);
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(JSON.parse(init.body)).toEqual({
      conversationId: CONV,
      orderItemDocumentIds: [OI1],
      mode: 'card',
    });

    // Ouvert tout seul, remerciement ajouté À LA conversation d'origine.
    expect(q('[role="dialog"]')).not.toBeNull();
    const texts = bot();
    expect(texts[0]).toContain('Total : 170 € HT');
    expect(texts[texts.length - 1]).toContain(
      'Votre commande est validée : 20 × Casquette brodée'
    );
    expect(q('textarea')).toBeNull();
    expect(container.textContent).toContain(
      'Conversation terminée — merci pour votre commande.'
    );
    expect(readChatClosing('u1')).toBeNull();
    expect(sessionStorage.getItem('peg_chat_locked_v1:u1')).toBe(CONV);

    act(() => {
      button('Nouvelle question')!.click();
    });
    expect(q('textarea')).not.toBeNull();
    expect(button('Nouvelle question')).toBeNull();
    expect(bot()).toEqual([]);
    expect(sessionStorage.getItem('peg_chat_locked_v1:u1')).toBeNull();
  });

  it('conversation affichée différente : la vue devient le remerciement, dans la conversation de la commande', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    noteTracedOrderItem(OI1, CONV);
    prepareChatClosing('u1', [OI1], 'deferred');
    // Le client a entre-temps démarré une autre conversation.
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify({
        conversationId: OTHER,
        messages: [{ role: 'user', content: 'Bonjour' }],
      })
    );
    fetchMock.mockResolvedValue(okReply());
    render();
    act(() => announceChatClosing('u1'));
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).mode).toBe('deferred');
    expect(bot()).toHaveLength(1);
    expect(container.querySelectorAll('.pcw-bubble--user')).toHaveLength(0);
    expect(
      JSON.parse(sessionStorage.getItem('peg_chat_widget_v2:u1')!)
        .conversationId
    ).toBe(CONV);
    expect(button('Nouvelle question')).not.toBeNull();
  });

  it('404 (serveur pas encore à jour) → rien ne s’affiche, enregistrement oublié', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockResolvedValue(json(404, { error: 'Not Found' }));
    render();
    act(() => paidOrder());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(q('[role="dialog"]')).toBeNull();
    expect(readChatClosing('u1')).toBeNull();
    expect(sessionStorage.getItem('peg_chat_locked_v1:u1')).toBeNull();
  });

  it('result:false (article introuvable) → rien', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockResolvedValue(
      json(200, { result: false, reason: 'not_found' })
    );
    render();
    act(() => paidOrder());
    await flush();
    expect(q('[role="dialog"]')).toBeNull();
  });

  it('erreur réseau → remerciement de repli et conversation verrouillée', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render();
    act(() => paidOrder());
    await flush();
    const texts = bot();
    expect(texts[texts.length - 1]).toContain(CHAT_CLOSING_FALLBACK);
    expect(q('textarea')).toBeNull();
    expect(button('Nouvelle question')).not.toBeNull();
  });

  it('500 → remerciement de repli', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockResolvedValue(json(503, {}));
    render();
    act(() => paidOrder());
    await flush();
    expect(bot().pop()).toContain(CHAT_CLOSING_FALLBACK);
  });

  it('clôture annoncée avant le montage du widget (retour de Stripe) → traitée au montage', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    fetchMock.mockResolvedValue(okReply());
    paidOrder();
    render();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bot().pop()).toContain('Merci Léa !');
  });

  it('aucun fetch au montage sans clôture annoncée (préparée seulement, ou trop ancienne)', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    noteTracedOrderItem(OI1, CONV);
    prepareChatClosing('u1', [OI1], 'card'); // paiement non abouti
    render();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => root.unmount());

    const old = {
      ...readChatClosing('u1')!,
      announced: true,
      createdAt: Date.now() - CHAT_CLOSING_MAX_AGE_MS - 1000,
    };
    sessionStorage.setItem('peg_chat_closing_v1:u1', JSON.stringify(old));
    root = createRoot(container);
    render();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readChatClosing('u1')).toBeNull();
  });

  it('commande sans article du chat → rien n’est préparé ; articles payés filtrés', () => {
    prepareChatClosing('u1', [OI2], 'card');
    expect(readChatClosing('u1')).toBeNull();
    noteTracedOrderItem(OI1, CONV);
    prepareChatClosing('u1', [OI1, OI2], 'card');
    expect(readChatClosing('u1')).toMatchObject({
      conversationId: CONV,
      orderItemDocumentIds: [OI1],
      announced: false,
    });
    // Stripe n'a pas encaissé OI1 → pas de clôture.
    announceChatClosing('u1', [OI2]);
    expect(readChatClosing('u1')).toBeNull();
  });

  it('conversation verrouillée conservée après rechargement de l’onglet', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify(conversation())
    );
    sessionStorage.setItem('peg_chat_locked_v1:u1', CONV);
    render();
    act(() => {
      q('button[aria-label="Ouvrir le chat assistant"]')!.click();
    });
    expect(q('textarea')).toBeNull();
    expect(button('Nouvelle question')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
