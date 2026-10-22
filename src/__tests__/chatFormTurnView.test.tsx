/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatFormTurnView from '@/components/template/chat/ChatFormTurnView';
import ChatWidget from '@/components/template/ChatWidget';
import type { ChatOffer } from '@/components/template/chatOffer';
import type {
  ChatFormAnswer,
  ChatFormAsk,
  ChatFormDraft,
  ChatFormTurn,
} from '@/components/template/chat/chatFormTypes';

// Boutons de la personnalisation guidée sous une réponse de l'assistant : chaque
// clic envoie son libellé EXACT comme message du client et l'action structurée
// (formInput) ; seuls les boutons du dernier message sont utilisables.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = jest.fn();
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/utils/hooks/useResponsive', () => () => ({
  smaller: { md: false },
  larger: { md: true },
}));
const mockUpload = jest.fn();
jest.mock('@/services/FileServices', () => ({
  apiUploadFile: (f: File) => mockUpload(f),
}));

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

const line = {
  productDocumentId: 'polo1',
  productName: 'Polo brodé',
  quantity: 20,
  sizeDocumentId: 'm',
  sizeName: 'M',
  totalHT: 240,
};
const draftOf = (over: Partial<ChatFormDraft> = {}): ChatFormDraft => ({
  v: 1,
  offer: { id: 'o1', lines: [line], totalHT: 249.9, totalTTC: 299.88 },
  productDocumentId: 'polo1',
  productName: 'Polo brodé',
  formDocumentId: 'form1',
  status: 'filling',
  values: {},
  skipped: [],
  later: [],
  prefilled: [],
  contactsConfirmed: false,
  lastAsked: null,
  ...over,
});
const askOf = (over: Partial<ChatFormAsk>): ChatFormAsk => ({
  key: 'e2col',
  label: 'Couleur du fil',
  section: 'Marquage',
  kind: 'choice',
  optional: false,
  ...over,
});
const answer: ChatFormAnswer = {
  data: { e1txt: 'ACME' },
  metadata: {
    source: 'assistant',
    filledAt: '2026-09-26T10:00:00.000Z',
    conversationId: 'c1',
  },
  state: 'pending',
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  sessionStorage.clear();
  mockUpload.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
  });
const buttons = () => [...container.querySelectorAll('button')];
const byText = (t: string) =>
  buttons().find((b) => b.textContent?.trim() === t) ?? null;
const click = (el: Element | null) =>
  act(() => {
    (el as HTMLButtonElement).click();
  });

const renderView = (
  turn: ChatFormTurn | unknown,
  opts: { active?: boolean; loading?: boolean; offer?: ChatOffer } = {}
) => {
  const onAct = jest.fn(() => true);
  const onGo = jest.fn();
  const onOfferChange = jest.fn();
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <ChatFormTurnView
          turn={turn}
          offer={opts.offer}
          active={opts.active ?? true}
          loading={opts.loading}
          onAct={onAct}
          onGo={onGo}
          onOfferChange={onOfferChange}
        />
      </Provider>
    );
  });
  return { onAct, onGo, onOfferChange };
};

describe('ChatFormTurnView — boutons', () => {
  it('proposition (Rapide) : « Oui, remplissons-la » / « Plus tard »', () => {
    const { onAct } = renderView({
      draft: draftOf({ status: 'proposed' }),
      proposal: true,
    });
    click(byText('Oui, remplissons-la'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'proposal', accept: true },
      'Oui, remplissons-la'
    );
    click(byText('Plus tard'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'proposal', accept: false },
      'Plus tard'
    );
  });

  it('options : un bouton par option, libellé exact, valeur d’option envoyée ; pas de « Passer » si obligatoire', () => {
    const { onAct } = renderView({
      draft: draftOf(),
      ask: askOf({
        options: [
          { label: 'Or', value: 'or' },
          { label: 'Argent', value: 'argent' },
          { label: 'Cœur & dos', value: 'coeur_dos' },
        ],
      }),
    });
    expect(buttons().map((b) => b.textContent)).toEqual([
      'Or',
      'Argent',
      'Cœur & dos',
    ]);
    click(byText('Cœur & dos'));
    expect(onAct).toHaveBeenCalledWith(
      { kind: 'choice', key: 'e2col', value: 'coeur_dos' },
      'Cœur & dos'
    );
    expect(byText('Passer')).toBeNull();
  });

  it('facultatif : « Passer » ; oui/non ; « Voir le récapitulatif »', () => {
    const { onAct } = renderView({
      draft: draftOf(),
      ask: askOf({
        key: 'e10bat',
        label: 'BAT numérique',
        kind: 'boolean',
        optional: true,
        options: [
          { label: 'Oui', value: 'oui' },
          { label: 'Non', value: 'non' },
        ],
      }),
      canFinish: true,
    });
    click(byText('Non'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'choice', key: 'e10bat', value: 'non' },
      'Non'
    );
    click(byText('Passer'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'skip', key: 'e10bat' },
      'Passer'
    );
    click(byText('Voir le récapitulatif'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'finish' },
      'Voir le récapitulatif'
    );
  });

  it('choix multiple : sélection puis « Valider la sélection »', () => {
    const { onAct } = renderView({
      draft: draftOf(),
      ask: askOf({
        key: 'e4tech',
        label: 'Techniques',
        kind: 'multichoice',
        multiple: true,
        options: [
          { label: 'Broderie', value: 'broderie' },
          { label: 'Sérigraphie', value: 'serigraphie' },
          { label: 'Transfert', value: 'transfert' },
        ],
      }),
    });
    expect(byText('Valider la sélection')!.disabled).toBe(true);
    click(byText('Broderie'));
    click(byText('Transfert'));
    expect(byText('Broderie')!.getAttribute('aria-pressed')).toBe('true');
    click(byText('Valider la sélection'));
    expect(onAct).toHaveBeenCalledWith(
      { kind: 'choice', key: 'e4tech', value: ['broderie', 'transfert'] },
      'Broderie, Transfert'
    );
  });

  it('coordonnées : « C’est bon » / « Modifier »', () => {
    const { onAct } = renderView({
      draft: draftOf(),
      contacts: [{ label: 'Téléphone', value: '06 12 34 56 78' }],
    });
    click(byText("C'est bon"));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'contacts', confirm: true },
      "C'est bon"
    );
    click(byText('Modifier'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'contacts', confirm: false },
      'Je veux modifier mes coordonnées'
    );
  });

  it('fichier : 📎 (téléversement réel simulé), logo déjà transmis, « Je l’enverrai plus tard »', async () => {
    mockUpload.mockResolvedValue({
      url: '/uploads/logo_ab12.png',
      name: 'logo_ab12.png',
    });
    const { onAct } = renderView({
      draft: draftOf(),
      ask: askOf({
        key: 'e8logo',
        label: 'Votre logo',
        kind: 'file',
        accept: '.png,.svg',
        multiple: false,
        logos: [
          {
            clientFileDocumentId: 'cf1',
            name: 'Logo ACME 2025',
            thumbnailUrl: 'https://x.s3.amazonaws.com/t.png',
            mime: 'image/png',
          },
        ],
      }),
    });
    expect(byText('📎 Joindre un fichier')).not.toBeNull();
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input.accept).toBe('.png,.svg');
    const file = new File([new Uint8Array(2048)], 'logo.png', {
      type: 'image/png',
    });
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    expect(mockUpload).toHaveBeenCalledWith(file);
    expect(onAct).toHaveBeenLastCalledWith(
      {
        kind: 'file',
        key: 'e8logo',
        files: [
          {
            storage: 'url',
            name: 'logo_ab12.png',
            originalName: 'logo.png',
            url: 'http://localhost:1337/uploads/logo_ab12.png',
            size: 2048,
            type: 'image/png',
          },
        ],
      },
      '📎 logo.png'
    );

    click(byText('Utiliser ce logo'));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'logo', key: 'e8logo', clientFileDocumentId: 'cf1' },
      'Logo : Logo ACME 2025'
    );
    expect(container.querySelector('.pcf-logo img')!.getAttribute('src')).toBe(
      'https://x.s3.amazonaws.com/t.png'
    );
    click(byText("Je l'enverrai plus tard"));
    expect(onAct).toHaveBeenLastCalledWith(
      { kind: 'later', key: 'e8logo' },
      "Je l'enverrai plus tard"
    );
  });

  it('téléversement en échec : message d’erreur, rien n’est envoyé', async () => {
    mockUpload.mockRejectedValue(new Error('réseau'));
    const { onAct } = renderView({
      draft: draftOf(),
      ask: askOf({ key: 'e8logo', label: 'Votre logo', kind: 'file' }),
    });
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File(['x'], 'logo.png')],
      configurable: true,
    });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    expect(onAct).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(
      "L'envoi de « logo.png » a échoué. Réessayez."
    );
  });

  it('boutons inactifs pendant une requête, retirés sous un message qui n’est plus le dernier', () => {
    const turn = {
      draft: draftOf(),
      ask: askOf({ options: [{ label: 'Or', value: 'or' }] }),
      canFinish: true,
    };
    renderView(turn, { loading: true });
    expect(buttons().length).toBeGreaterThan(0);
    expect(buttons().every((b) => b.disabled)).toBe(true);
    renderView(turn, { active: false });
    expect(buttons()).toHaveLength(0);
  });

  it('form corrompu (relu du stockage) : rien n’est affiché', () => {
    renderView({ draft: { v: 9 }, proposal: true });
    expect(container.innerHTML).toBe('');
  });
});

describe('ChatFormTurnView — récapitulatif', () => {
  const recapTurn: ChatFormTurn = {
    draft: draftOf({ status: 'review', later: ['e8logo'] }),
    recap: {
      productDocumentId: 'polo1',
      productName: 'Polo brodé',
      formDocumentId: 'form1',
      items: [
        {
          key: 'e1txt',
          label: 'Texte à broder',
          display: 'ACME',
          status: 'filled',
        },
        {
          key: 'e2col',
          label: 'Couleur du fil',
          display: '—',
          status: 'skipped',
        },
        {
          key: 'e8logo',
          label: 'Votre logo',
          display: 'À envoyer depuis le panier',
          status: 'later',
        },
      ],
      answer,
    },
  };
  const recapOffer: ChatOffer = {
    id: 'o1-perso',
    lines: [line],
    totalHT: 249.9,
    totalTTC: 299.88,
  };

  it('carte « Votre personnalisation » ; « Modifier » → fiche ouverte sur le formulaire pré-rempli', () => {
    const { onGo, onOfferChange } = renderView(recapTurn, {
      offer: recapOffer,
    });
    const card = container.querySelector('.pcf-recap')!;
    expect(card.textContent).toContain('Votre personnalisation');
    expect(card.textContent).toContain('Texte à broder');
    expect(card.textContent).toContain('—');
    expect(card.textContent).toContain('À envoyer depuis le panier');
    click(byText('Modifier'));
    expect(onGo).toHaveBeenCalledWith('/customer/product/polo1', {
      chatOffer: {
        offerId: 'o1-perso',
        quantity: 20,
        lines: [line],
        answer,
        openForm: true,
      },
    });
    // L'ajout se fera depuis la fiche : l'offre du récapitulatif ne propose plus « Ajouter au panier ».
    expect(onOfferChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'o1-perso',
        status: 'completing',
        pendingIds: ['polo1'],
        cartIdsBefore: [],
      })
    );
  });

  it('récapitulatif d’un ancien message : lisible, « Modifier » inactif', () => {
    renderView(recapTurn, { offer: recapOffer, active: false });
    expect(container.querySelector('.pcf-recap')).not.toBeNull();
    expect(byText('Modifier')!.disabled).toBe(true);
  });
});

// ── Dans le widget : le clic part avec le message, UNE fois ───────────────────

const sse = (payload: object) => {
  const enc = new TextEncoder();
  const reply = (payload as { reply: string }).reply;
  const events = [
    `event: delta\ndata: ${JSON.stringify({ text: reply })}\n\n`,
    `event: done\ndata: ${JSON.stringify(payload)}\n\n`,
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

describe('ChatWidget — personnalisation guidée', () => {
  it('proposition → clic : texte + formInput envoyés, puis formDraft seul au message suivant ; trombone pour un fichier', async () => {
    const proposed = draftOf({ status: 'proposed', lastAsked: '__proposal__' });
    const filling = draftOf({ lastAsked: 'e8logo' });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        sse({
          reply:
            'Total : 249,90 € HT.\n\nJe remplis la personnalisation avec vous ?',
          authenticated: true,
          cards: [],
          offer: { id: 'o1', lines: [line], totalHT: 249.9, totalTTC: 299.88 },
          form: { draft: proposed, proposal: true },
        })
      )
      .mockResolvedValueOnce(
        sse({
          reply:
            'Votre logo : joignez le fichier avec 📎, ou envoyez-le plus tard.',
          authenticated: true,
          cards: [],
          offer: null,
          form: {
            draft: filling,
            ask: askOf({
              key: 'e8logo',
              label: 'Votre logo',
              kind: 'file',
              optional: false,
            }),
          },
        })
      )
      .mockResolvedValueOnce(
        sse({
          reply: 'Bien sûr.',
          authenticated: true,
          cards: [],
          offer: null,
          form: { draft: filling },
        })
      );
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify({ conversationId: 'c1', messages: [] })
    );
    act(() => {
      root.render(
        <Provider store={makeStore()}>
          <MemoryRouter initialEntries={['/home']}>
            <ChatWidget />
          </MemoryRouter>
        </Provider>
      );
    });
    click(
      container.querySelector('button[aria-label="Ouvrir le chat assistant"]')
    );
    const type = (text: string) => {
      const field = container.querySelector('textarea') as HTMLTextAreaElement;
      act(() => {
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        )!.set!.call(field, text);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    type('20 polos brodés M');
    await act(async () => {
      (
        container.querySelector(
          'button[aria-label="Envoyer"]'
        ) as HTMLButtonElement
      ).click();
    });
    await flush();
    let body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.formDraft).toBeNull();
    expect(
      JSON.parse(sessionStorage.getItem('peg_chat_form_v1:c1')!).status
    ).toBe('proposed');
    // Bouton panier de l'offre ET proposition de personnalisation.
    expect(
      container.querySelector('button[aria-label="Ajouter l\'offre au panier"]')
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="📎 Joindre un fichier"]')
    ).toBeNull();

    await act(async () => {
      byText('Oui, remplissons-la')!.click();
    });
    await flush();
    body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.messages.at(-1)).toEqual({
      role: 'user',
      content: 'Oui, remplissons-la',
    });
    expect(body.formInput).toEqual({ kind: 'proposal', accept: true });
    expect(body.formDraft).toEqual(proposed);
    // Proposition passée : ses boutons ont disparu ; le dernier message demande un fichier → trombone.
    expect(byText('Oui, remplissons-la')).toBeNull();
    expect(
      container.querySelector('button[aria-label="📎 Joindre un fichier"]')
    ).not.toBeNull();

    type('Je vous l’envoie demain');
    await act(async () => {
      (
        container.querySelector(
          'button[aria-label="Envoyer"]'
        ) as HTMLButtonElement
      ).click();
    });
    await flush();
    body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.formInput).toBeUndefined();
    expect(body.formDraft).toEqual(filling);
  });

  it('« Nouvelle conversation » : le brouillon de l’échange précédent ne repart pas', async () => {
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify({
        conversationId: 'c1',
        messages: [
          { role: 'user', content: 'polos' },
          { role: 'assistant', content: 'Voici.' },
        ],
      })
    );
    sessionStorage.setItem('peg_chat_form_v1:c1', JSON.stringify(draftOf()));
    const fetchMock = jest.fn().mockResolvedValue(
      sse({
        reply: 'Bonjour !',
        authenticated: true,
        cards: [],
        offer: null,
        form: null,
      })
    );
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
    act(() => {
      root.render(
        <Provider store={makeStore()}>
          <MemoryRouter initialEntries={['/home']}>
            <ChatWidget />
          </MemoryRouter>
        </Provider>
      );
    });
    click(
      container.querySelector('button[aria-label="Ouvrir le chat assistant"]')
    );
    click(
      container.querySelector('button[aria-label="Nouvelle conversation"]')
    );
    await act(async () => {
      (
        buttons().find((b) =>
          b.textContent?.includes('Je cherche un produit')
        ) as HTMLButtonElement
      ).click();
    });
    await flush();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.conversationId).not.toBe('c1');
    expect(body.formDraft).toBeNull();
    // Le brouillon de c1 reste rangé sous sa conversation (rien n'est écrasé).
    expect(
      JSON.parse(sessionStorage.getItem('peg_chat_form_v1:c1')!)
        .productDocumentId
    ).toBe('polo1');
  });
});
