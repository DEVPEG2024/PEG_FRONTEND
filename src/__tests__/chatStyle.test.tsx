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
import {
  CHAT_STYLE_LABELS,
  chatStyleSupported,
  noteChatServerFeatures,
  readChatStyle,
  saveChatStyle,
} from '@/components/template/chat/chatStyle';

// Style de réponse de l'assistant (26/09/2026) : ⚡ Rapide / 💬 Conseil, choisi à la
// 1re ouverture, basculé dans l'en-tête, mémorisé par compte et par appareil, envoyé
// à chaque message. Serveur sans styles → bascule masquée, style plus envoyé.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom ne fait pas défiler : la conversation appelle scrollIntoView à chaque message.
Element.prototype.scrollIntoView = jest.fn();

let phone = false;
jest.mock('@/utils/hooks/useResponsive', () => () => ({
  smaller: { md: phone },
  larger: { md: !phone },
}));

// Réponse en flux SSE de l'agent, précédée de l'événement `open` du serveur.
const sse = (
  reply: string,
  open: object | null = { model: 'openai:gpt-4.1-mini', features: ['style'] }
) => {
  const enc = new TextEncoder();
  const events = [
    ...(open ? [`event: open\ndata: ${JSON.stringify(open)}\n\n`] : []),
    `event: delta\ndata: ${JSON.stringify({ text: reply })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ reply, authenticated: true, cards: [] })}\n\n`,
  ];
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/event-stream' },
    body: {
      getReader: () => ({
        read: async () =>
          i < events.length
            ? { value: enc.encode(events[i++]), done: false }
            : { value: undefined, done: true },
      }),
    },
  };
};

let user: Record<string, unknown> | null = {
  documentId: 'u1',
  firstName: 'Léa',
  lastName: 'Martin',
};
const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({
        user: () => ({ user }),
        session: () => ({ token: 'jwt' }),
      }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }),
  });

let container: HTMLDivElement;
let root: Root;
const fetchMock = jest.fn();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  fetchMock
    .mockReset()
    .mockImplementation(async () => sse('Voici notre modèle 👇'));
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  phone = false;
  user = { documentId: 'u1', firstName: 'Léa', lastName: 'Martin' };
  jest.restoreAllMocks();
});

const render = () =>
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/home']}>
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
const click = (el: Element | null) =>
  act(() => {
    (el as HTMLButtonElement).click();
  });
const openChat = () =>
  click(q('button[aria-label="Ouvrir le chat assistant"]'));
const chooser = () => q('.pcw-style-choose');
const toggle = () => q('.pcw-style-toggle');
const type = (text: string) => {
  const field = q<HTMLTextAreaElement>('textarea')!;
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const sendTyped = async (text: string) => {
  type(text);
  click(q('button[aria-label="Envoyer"]'));
  await flush();
};
const sentBody = (call: number) =>
  JSON.parse(fetchMock.mock.calls[call][1].body);

describe('chatStyle — mémorisation par compte et par appareil', () => {
  it('clé peg_chat_style:<documentId>, comptes indépendants', () => {
    saveChatStyle('u1', 'quick');
    saveChatStyle('u2', 'advice');
    expect(localStorage.getItem('peg_chat_style:u1')).toBe('quick');
    expect(localStorage.getItem('peg_chat_style:u2')).toBe('advice');
    expect(readChatStyle('u1')).toBe('quick');
    expect(readChatStyle('u2')).toBe('advice');
    expect(readChatStyle('u3')).toBeNull();
  });

  it('valeur inconnue ignorée ; sans compte, rien n’est lu ni écrit', () => {
    localStorage.setItem('peg_chat_style:u1', 'bavard');
    expect(readChatStyle('u1')).toBeNull();
    saveChatStyle(null, 'quick');
    saveChatStyle(undefined, 'quick');
    expect(localStorage.length).toBe(1);
    expect(readChatStyle(null)).toBeNull();
  });

  it('stockage bloqué (navigation privée) : aucune erreur', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveChatStyle('u1', 'quick')).not.toThrow();
    expect(readChatStyle('u1')).toBeNull();
    // Annonce du serveur gardée en mémoire quand le stockage de session est inaccessible.
    expect(() => noteChatServerFeatures(['style'])).not.toThrow();
    expect(chatStyleSupported()).toBe(true);
  });

  it('fonctions du serveur : inconnu tant que rien n’est annoncé, puis selon `features`', () => {
    expect(chatStyleSupported()).toBeNull();
    noteChatServerFeatures(['style']);
    expect(chatStyleSupported()).toBe(true);
    noteChatServerFeatures(undefined);
    expect(chatStyleSupported()).toBe(false);
    noteChatServerFeatures('style');
    expect(chatStyleSupported()).toBe(false);
  });

  it('libellés exacts', () => {
    expect(CHAT_STYLE_LABELS.quick).toEqual({
      emoji: '⚡',
      label: 'Rapide',
      hint: 'Réponses courtes, droit au but',
    });
    expect(CHAT_STYLE_LABELS.advice).toEqual({
      emoji: '💬',
      label: 'Conseil',
      hint: "Je m'intéresse à votre projet et je vous conseille",
    });
  });
});

describe('ChatWidget — choix du style', () => {
  it('accueil sans choix : question et boutons ⚡ Rapide / 💬 Conseil ; le clic enregistre et les efface', () => {
    render();
    openChat();
    expect(chooser()!.textContent).toContain(
      'Comment préférez-vous que je vous réponde ?'
    );
    const opts = [...container.querySelectorAll('.pcw-style-opt')].map(
      (b) => b.textContent
    );
    expect(opts).toEqual([
      '⚡ RapideRéponses courtes, droit au but',
      "💬 ConseilJe m'intéresse à votre projet et je vous conseille",
    ]);
    click(q('.pcw-style-opt[data-style="quick"]'));
    expect(localStorage.getItem('peg_chat_style:u1')).toBe('quick');
    expect(chooser()).toBeNull();
    expect(toggle()!.textContent).toBe('⚡Rapide');
  });

  it('déjà choisi sur cet appareil : pas de question, le style part avec le message', async () => {
    localStorage.setItem('peg_chat_style:u1', 'quick');
    render();
    openChat();
    expect(chooser()).toBeNull();
    await sendTyped('Je cherche une casquette');
    expect(sentBody(0).style).toBe('quick');
  });

  it('il écrit sans choisir → Conseil, envoyé et retenu', async () => {
    render();
    openChat();
    await sendTyped('Je cherche une casquette');
    expect(sentBody(0).style).toBe('advice');
    expect(localStorage.getItem('peg_chat_style:u1')).toBe('advice');
    // Les suggestions et la question d'accueil disparaissent avec la conversation.
    expect(chooser()).toBeNull();
  });

  it('bascule de l’en-tête : le message suivant part en Rapide', async () => {
    render();
    openChat();
    await sendTyped('Bonjour');
    expect(sentBody(0).style).toBe('advice');
    const t = toggle()!;
    expect(t.getAttribute('aria-label')).toBe(
      'Style de réponse : Conseil — passer en Rapide'
    );
    expect(t.getAttribute('title')).toBe(
      'Style de réponse : Conseil — passer en Rapide'
    );
    expect(t.textContent).toBe('💬Conseil');
    click(t);
    expect(toggle()!.getAttribute('aria-label')).toBe(
      'Style de réponse : Rapide — passer en Conseil'
    );
    expect(localStorage.getItem('peg_chat_style:u1')).toBe('quick');
    await sendTyped('Et pour 20 pièces ?');
    expect(sentBody(1).style).toBe('quick');
  });

  it('serveur sans styles (`open` sans `features`) : bascule masquée, style plus envoyé', async () => {
    fetchMock.mockImplementation(async () =>
      sse('Voici notre modèle 👇', { model: 'groq:openai/gpt-oss-120b' })
    );
    render();
    openChat();
    expect(toggle()).not.toBeNull(); // inconnu : optimiste
    await sendTyped('Bonjour');
    expect(toggle()).toBeNull();
    await sendTyped('Et pour 20 pièces ?');
    expect(sentBody(1)).not.toHaveProperty('style');
  });

  it('serveur avec styles : la bascule reste', async () => {
    render();
    openChat();
    await sendTyped('Bonjour');
    expect(sessionStorage.getItem('peg_chat_features_v1')).toBe('["style"]');
    expect(toggle()).not.toBeNull();
  });

  it('comptes indépendants sur le même appareil', () => {
    localStorage.setItem('peg_chat_style:u2', 'quick');
    render();
    openChat();
    expect(chooser()).not.toBeNull(); // u1 n'a pas choisi
  });

  it('téléphone : emoji seul dans l’en-tête, libellé accessible complet', () => {
    phone = true;
    localStorage.setItem('peg_chat_style:u1', 'advice');
    render();
    openChat();
    const t = toggle()!;
    expect(t.classList.contains('pcw-style-toggle--compact')).toBe(true);
    expect(t.textContent).toBe('💬');
    expect(t.getAttribute('aria-label')).toBe(
      'Style de réponse : Conseil — passer en Rapide'
    );
  });

  it('sans compte : ni question, ni bascule, ni style envoyé', async () => {
    user = null;
    render();
    openChat();
    expect(chooser()).toBeNull();
    expect(toggle()).toBeNull();
    await sendTyped('Bonjour');
    expect(sentBody(0)).not.toHaveProperty('style');
  });
});
