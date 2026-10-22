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
import { parseChatChoice } from '@/components/template/chat/chatChoice';

// « 3 bonnets » sur un Bonnet à 9 couleurs (22/10/2026) : l'assistant donne le prix et
// demande la couleur avec une pastille par couleur ; le clic part comme message
// (« MARINE ») avec `offerChoice`, et la réponse rechiffrée porte l'offre panier.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = jest.fn();
jest.mock('@/utils/hooks/useResponsive', () => () => ({ smaller: { md: false }, larger: { md: true } }));

const line = { productDocumentId: 'bonnet1', productName: 'Bonnet', quantity: 3, totalHT: 35.7, sizeDocumentId: 'tu', sizeName: 'Taille unique' };
const choice = {
  kind: 'color',
  productDocumentId: 'bonnet1',
  productName: 'Bonnet',
  quantity: 3,
  options: [
    { documentId: 'noir', name: 'NOIR', hex: '#000000' },
    { documentId: 'marine', name: 'MARINE', hex: '#1b2a4a' },
    { documentId: 'moutarde', name: 'MOUTARDE', hex: null },
  ],
  lines: [line],
};
const offer = { id: 'o2', lines: [{ ...line, colorDocumentId: 'marine', colorName: 'MARINE' }], totalHT: 45.6, totalTTC: 54.72 };

const sse = (done: Record<string, unknown>) => {
  const enc = new TextEncoder();
  const events = [
    `event: open\ndata: ${JSON.stringify({ model: 'openai:gpt-4.1-mini', features: ['style'] })}\n\n`,
    `event: delta\ndata: ${JSON.stringify({ text: done.reply })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ authenticated: true, cards: [], ...done })}\n\n`,
  ];
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/event-stream' },
    body: { getReader: () => ({ read: async () => (i < events.length ? { value: enc.encode(events[i++]), done: false } : { value: undefined, done: true }) }) },
  };
};

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({ user: () => ({ user: { documentId: 'u1', firstName: 'Julie' } }), session: () => ({ token: 'jwt' }) }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });

let container: HTMLDivElement;
let root: Root;
const fetchMock = jest.fn();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('peg_chat_style:u1', 'advice');
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

const flush = () => act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
const q = (sel: string) => container.querySelector(sel) as HTMLElement | null;
const click = (el: Element | null) => act(() => { (el as HTMLButtonElement).click(); });
const buttonNamed = (name: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) || null;
const sendTyped = async (text: string) => {
  const field = container.querySelector('textarea') as HTMLTextAreaElement;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  click(q('button[aria-label="Envoyer"]'));
  await flush();
};
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

describe('parseChatChoice', () => {
  it('valide la forme reçue du réseau', () => {
    const c = parseChatChoice(choice)!;
    expect(c.options.map((o) => o.name)).toEqual(['NOIR', 'MARINE', 'MOUTARDE']);
    expect(parseChatChoice({ ...choice, options: [{ documentId: 'x', name: 'X', hex: 'rouge' }, choice.options[0]] })!.options[0].hex).toBeNull();
  });
  it('rejette ce qui ne peut pas être rechiffré', () => {
    for (const bad of [
      null,
      { ...choice, kind: 'size' },
      { ...choice, options: [choice.options[0]] },
      { ...choice, productDocumentId: 'a b' },
      { ...choice, lines: [] },
      { ...choice, lines: [{ ...line, productDocumentId: 'autre' }] },
      { ...choice, quantity: 0 },
    ]) expect(parseChatChoice(bad)).toBeUndefined();
  });
});

describe('ChatWidget — couleur demandée avant l’offre panier', () => {
  it('pastilles sous la question ; le clic envoie la couleur ; l’offre rechiffrée arrive avec « Ajouter au panier »', async () => {
    fetchMock
      .mockImplementationOnce(async () => sse({ reply: 'Total : 45,60 € HT (54,72 € TTC), livraison incluse.\nQuelle couleur pour vos 3 Bonnet ? Choisissez-la ci-dessous 👇', choice, offer: null }))
      .mockImplementationOnce(async () => sse({ reply: 'Total : 45,60 € HT (54,72 € TTC), livraison incluse.\nAjoutez-la au panier en un clic 👇', offer, choice: null }))
      .mockImplementation(async () => sse({ reply: 'Avec plaisir.' }));

    act(() => {
      root.render(
        <Provider store={makeStore()}>
          <MemoryRouter initialEntries={['/home']}>
            <ChatWidget />
          </MemoryRouter>
        </Provider>
      );
    });
    click(q('button[aria-label="Ouvrir le chat assistant"]'));
    await sendTyped('3 bonnets');

    // Le widget annonce qu'il sait afficher les couleurs ; aucun choix envoyé.
    expect(sentBody(0).choices).toBe(true);
    expect(sentBody(0).offerChoice).toBeUndefined();
    const group = q('[role="group"][aria-label="Couleur — Bonnet, 3 pièces"]');
    expect(group).not.toBeNull();
    expect([...group!.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['NOIR', 'MARINE', 'MOUTARDE']);
    expect(buttonNamed('Ajouter au panier')).toBeNull();

    await click(buttonNamed('MARINE'));
    await flush();
    const body = sentBody(1);
    expect(body.messages[body.messages.length - 1]).toEqual({ role: 'user', content: 'MARINE' });
    expect(body.offerChoice).toEqual({ productDocumentId: 'bonnet1', optionDocumentId: 'marine', lines: [line] });

    // Offre rechiffrée : bouton panier, plus de pastilles.
    expect(q('[role="group"][aria-label="Couleur — Bonnet, 3 pièces"]')).toBeNull();
    expect(container.textContent).toContain('3 × Bonnet — Taille unique MARINE');
    expect(q('button[aria-label="Ajouter l\'offre au panier"]')).not.toBeNull();

    // Le choix n'est envoyé qu'une fois.
    await sendTyped('Merci');
    expect(sentBody(2).offerChoice).toBeUndefined();
  });
});
