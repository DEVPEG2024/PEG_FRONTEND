/**
 * @jest-environment jsdom
 */
// Store de l'application chargé EN PREMIER : cartSlice → store de la fiche →
// @/store forment un cycle d'imports ; commencé par cartSlice, le store de
// l'application se construirait sans le panier.
import appStore from '@/store';
import ShowProduct from '@/views/app/customer/products/show/ShowProduct';
import ShowOrderItem from '@/views/app/common/orderItem/ShowOrderItem';
import PersonalizeDialog from '@/views/app/customer/cart/PersonalizeDialog';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatOfferAction from '@/components/template/ChatOfferAction';
import ChatWidget from '@/components/template/ChatWidget';
import {
  personalizationStatus,
  type ChatOffer,
} from '@/components/template/chatOffer';
import type {
  ChatFormAnswer,
  ChatFormDraft,
} from '@/components/template/chat/chatFormTypes';
import type { CartItem } from '@/@types/cart';

// Personnalisation remplie dans le chat → panier : la ligne porte la réponse
// (state 'submitted', metadata.source 'assistant') et le panier la considère
// faite. Sans réponse du chat, comportement inchangé (réponse « en attente »).
// Vrai reducer du panier ; seul le chargement du produit (GraphQL) est simulé.

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
// Fiche produit : éditeur riche et carrousel hors sujet ici (et non chargeables sous jest).
jest.mock('@/components/shared', () => ({ RichTextEditor: () => null }));
jest.mock('@/components/shared/ProductImageCarousel', () => () => null);

const form = {
  documentId: 'form1',
  name: 'Personnalisation du produit',
  fields: [
    {
      id: 'e1txt',
      type: 'textfield',
      label: 'Texte à broder',
      input: true,
      validate: { required: true },
    },
    { id: 'e8logo', type: 'file', label: 'Votre logo', input: true },
  ],
};
const products: Record<string, unknown> = {
  polo1: {
    documentId: 'polo1',
    name: 'Polo brodé',
    pricingMode: 'tiers',
    priceTiers: [{ minQuantity: 1, price: 12 }],
    sizes: [
      { documentId: 's', name: 'S', value: 'S' },
      { documentId: 'm', name: 'M', value: 'M' },
    ],
    colors: [{ documentId: 'marine', name: 'MARINE', value: '#1b2a4a' }],
    form,
  },
};
const mockUpload = jest.fn();
jest.mock('@/services/FileServices', () => ({
  apiUploadFile: (f: File) => mockUpload(f),
}));
const mockOrderItem = jest.fn();
jest.mock('@/services/OrderItemServices', () => ({
  apiGetOrderItemById: () =>
    Promise.resolve({ data: { data: { orderItem: mockOrderItem() } } }),
}));
jest.mock('@/services/ProductServices', () => ({
  apiGetProductForShowById: (id: string) =>
    Promise.resolve({ data: { data: { product: products[id] } } }),
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
type Store = ReturnType<typeof makeStore>;
const cartOf = (store: Store) =>
  (store.getState() as { base: { cart: { cart: CartItem[] } } }).base.cart.cart;

const answer: ChatFormAnswer = {
  data: {
    e1txt: 'ACME',
    e8logo: [
      {
        storage: 'url',
        name: 'logo.png',
        originalName: 'logo.png',
        url: 'https://x.s3.amazonaws.com/logo.png',
        size: 2048,
        type: 'image/png',
      },
    ],
  },
  metadata: {
    source: 'assistant',
    filledAt: '2026-09-26T10:00:00.000Z',
    conversationId: 'c1',
  },
  state: 'submitted',
};
const polo = (sizeDocumentId?: string) => ({
  productDocumentId: 'polo1',
  productName: 'Polo brodé',
  quantity: 20,
  totalHT: 240,
  ...(sizeDocumentId
    ? { sizeDocumentId, sizeName: sizeDocumentId.toUpperCase() }
    : {}),
});
const offerOf = (lines: ChatOffer['lines'], id = 'o1-perso'): ChatOffer => ({
  id,
  lines,
  totalHT: 249.9,
  totalTTC: 299.88,
});

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  sessionStorage.clear();
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

const clickAdd = async (
  offer: ChatOffer,
  formAnswers?: Record<string, ChatFormAnswer>
) => {
  const store = makeStore();
  const onGo = jest.fn();
  const onChange = jest.fn();
  await act(async () => {
    root.render(
      <Provider store={store}>
        <ChatOfferAction
          offer={offer}
          onChange={onChange}
          onGo={onGo}
          formAnswers={formAnswers}
        />
      </Provider>
    );
  });
  await act(async () => {
    (
      container.querySelector(
        'button[aria-label="Ajouter l\'offre au panier"]'
      ) as HTMLButtonElement
    ).click();
  });
  await flush();
  return { cart: cartOf(store), store, onGo, onChange };
};

const clickButton = async (label: string | RegExp) => {
  const b = [...container.querySelectorAll('button')].find((x) =>
    typeof label === 'string' ? x.textContent?.trim() === label : label.test(x.textContent ?? '')
  );
  expect(b).toBeDefined();
  await act(async () => {
    b!.click();
  });
  await flush();
};

describe('ChatOfferAction — personnalisation remplie dans le chat', () => {
  it('avec la réponse du récapitulatif : la ligne entre au panier personnalisée (submitted, source assistant)', async () => {
    const { cart, onGo, onChange } = await clickAdd(offerOf([polo('m')]), {
      polo1: answer,
    });
    expect(cart).toHaveLength(1);
    const fa = cart[0].formAnswer as unknown as {
      form: { documentId: string };
      answer: ChatFormAnswer;
    };
    expect(fa.form.documentId).toBe('form1');
    expect(fa.answer.state).toBe('submitted');
    expect(fa.answer.metadata.source).toBe('assistant');
    expect(fa.answer.data).toEqual(answer.data);
    expect(personalizationStatus(cart[0])).toBe('done');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'added' })
    );
    expect(onGo).toHaveBeenCalledWith('/customer/cart', {
      openPersonalization: true,
    });
  });

  it('fichier « plus tard » : réponse pending → le panier redemande le logo', async () => {
    const { cart } = await clickAdd(offerOf([polo('m')]), {
      polo1: { ...answer, state: 'pending' },
    });
    expect(
      (cart[0].formAnswer as unknown as { answer: ChatFormAnswer }).answer
        .metadata.filledAt
    ).toBe(answer.metadata.filledAt);
    expect(personalizationStatus(cart[0])).not.toBe('done');
  });

  it('sans formAnswers : comportement actuel, réponse « en attente »', async () => {
    const { cart } = await clickAdd(offerOf([polo('m')], 'o1'));
    expect(cart).toHaveLength(1);
    const fa = cart[0].formAnswer as unknown as {
      answer: { state: string; metadata: { filledAt?: string } };
    };
    expect(fa.answer.state).toBe('pending');
    expect(fa.answer.metadata.filledAt).toBeUndefined();
    expect(personalizationStatus(cart[0])).toBe('required');
  });

  it('taille non dite : demandée dans le chat ; un clic → au panier AVEC la réponse du chat', async () => {
    const { cart, store, onGo } = await clickAdd(offerOf([polo()]), { polo1: answer });
    expect(cart).toHaveLength(0);
    expect(onGo).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Quelle taille pour vos 20 pièces');
    await clickButton('M');
    const items = cartOf(store);
    expect(items).toHaveLength(1);
    expect(items[0].sizeAndColors).toEqual([expect.objectContaining({ quantity: 20, size: expect.objectContaining({ name: 'M' }) })]);
    expect((items[0].formAnswer as unknown as { answer: ChatFormAnswer }).answer).toEqual(answer);
  });

  it('tailles à répartir : « Répartir sur la fiche » ouvre la fiche avec la réponse du chat, rien n’est ajouté', async () => {
    const { store, onGo } = await clickAdd(offerOf([polo()]), { polo1: answer });
    await clickButton(/Répartir sur la fiche/);
    expect(cartOf(store)).toHaveLength(0);
    expect(onGo).toHaveBeenCalledWith('/customer/product/polo1', {
      chatOffer: expect.objectContaining({
        offerId: 'o1-perso',
        quantity: 20,
        answer,
      }),
    });
  });
});

// ── De bout en bout dans le widget : récapitulatif reçu → panier ──────────────

const draft: ChatFormDraft = {
  v: 1,
  offer: { id: 'o1', lines: [polo('m')], totalHT: 249.9, totalTTC: 299.88 },
  productDocumentId: 'polo1',
  productName: 'Polo brodé',
  formDocumentId: 'form1',
  status: 'review',
  values: { e1txt: 'ACME' },
  skipped: [],
  later: [],
  prefilled: [],
  contactsConfirmed: true,
  lastAsked: null,
};
const sseDone = (payload: object) => {
  const enc = new TextEncoder();
  const events = [
    `event: delta\ndata: ${JSON.stringify({ text: (payload as { reply: string }).reply })}\n\n`,
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

describe('ChatWidget — récapitulatif de personnalisation → panier', () => {
  it('carte « Votre personnalisation » + offre <id>-perso ; l’ajout porte la réponse et termine le brouillon', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      sseDone({
        reply: 'Voici le récapitulatif de votre personnalisation 👇',
        authenticated: true,
        cards: [],
        offer: null,
        form: {
          draft,
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
                key: 'e8logo',
                label: 'Votre logo',
                display: 'logo.png',
                status: 'filled',
              },
            ],
            answer,
          },
        },
      })
    );
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
    sessionStorage.setItem(
      'peg_chat_widget_v2:u1',
      JSON.stringify({ conversationId: 'c1', messages: [] })
    );
    sessionStorage.setItem(
      'peg_chat_form_v1:c1',
      JSON.stringify({ ...draft, status: 'filling' })
    );
    const store = makeStore();
    act(() => {
      root.render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/home']}>
            <ChatWidget />
          </MemoryRouter>
        </Provider>
      );
    });
    act(() => {
      (
        container.querySelector(
          'button[aria-label="Ouvrir le chat assistant"]'
        ) as HTMLButtonElement
      ).click();
    });
    const field = container.querySelector('textarea') as HTMLTextAreaElement;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )!.set!.call(field, 'Le logo est joint, c’est tout');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      (
        container.querySelector(
          'button[aria-label="Envoyer"]'
        ) as HTMLButtonElement
      ).click();
    });
    await flush();

    // Le brouillon est parti avec le message.
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.formDraft).toEqual({ ...draft, status: 'filling' });
    expect(body.formInput).toBeUndefined();

    const recap = container.querySelector('.pcf-recap');
    expect(recap?.textContent).toContain('Votre personnalisation');
    expect(recap?.textContent).toContain('ACME');
    const saved = JSON.parse(sessionStorage.getItem('peg_chat_widget_v2:u1')!);
    expect(saved.messages.at(-1).offer.id).toBe('o1-perso');

    await act(async () => {
      (
        container.querySelector(
          'button[aria-label="Ajouter l\'offre au panier"]'
        ) as HTMLButtonElement
      ).click();
    });
    await flush();
    const cart = cartOf(store);
    expect(cart).toHaveLength(1);
    expect(
      (cart[0].formAnswer as unknown as { answer: ChatFormAnswer }).answer
    ).toEqual(answer);
    expect(personalizationStatus(cart[0])).toBe('done');
    // Récapitulatif au panier : la personnalisation du chat est terminée.
    expect(sessionStorage.getItem('peg_chat_form_v1:c1')).toBeNull();
  });
});

// ── « Modifier » du récapitulatif : la fiche produit reprend la réponse du chat ──

describe('ShowProduct — ouverte depuis « Modifier » du récapitulatif', () => {
  it('s’ouvre sur le formulaire pré-rempli ; « Récapitulatif » puis « Ajouter au panier » gardent la réponse du chat', async () => {
    const store = appStore;
    const chatOffer = {
      offerId: 'o1-perso',
      quantity: 20,
      lines: [polo('m')],
      answer,
      openForm: true,
    };
    await act(async () => {
      root.render(
        <Provider store={store}>
          <MemoryRouter
            initialEntries={[
              { pathname: '/customer/product/polo1', state: { chatOffer } },
            ]}
          >
            <Routes>
              <Route
                path="/customer/product/:documentId"
                element={<ShowProduct />}
              />
              <Route
                path="/customer/cart"
                element={<div data-testid="panier" />}
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );
    });
    await flush();
    // Étape « Détails » (formulaire), valeur remplie dans le chat déjà en place.
    expect(container.textContent).toContain('Détails du produit');
    expect(
      (container.querySelector('input[type="text"]') as HTMLInputElement).value
    ).toBe('ACME');
    // Réponse déjà complète : le client peut aller au récapitulatif sans ressaisir.
    const recapBtn = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Récapitulatif'
    ) as HTMLButtonElement;
    await act(async () => {
      recapBtn.click();
    });
    const add = [...container.querySelectorAll('button')].find((b) =>
      /Ajouter au panier/.test(b.textContent || '')
    ) as HTMLButtonElement;
    expect(add.disabled).toBe(false);
    await act(async () => {
      add.click();
    });
    await flush();
    const cart = (
      store.getState() as unknown as { base: { cart: { cart: CartItem[] } } }
    ).base.cart.cart;
    const item = cart[cart.length - 1];
    expect(
      (item.formAnswer as unknown as { answer: ChatFormAnswer }).answer
    ).toEqual(answer);
    expect(
      item.sizeAndColors.map((x) => `${x.quantity} ${x.size.name}`)
    ).toEqual(['20 M']);
    expect(container.querySelector('[data-testid="panier"]')).not.toBeNull();
  });
});

// ── Pop-up « Ajoutez votre logo » du panier : la trace de l'assistant reste ──

describe('Panier — logo envoyé plus tard, personnalisation commencée dans le chat', () => {
  it('la nouvelle réponse garde source et filledAt (badge « Rempli avec l’assistant » à la commande)', async () => {
    mockUpload.mockResolvedValue({
      url: '/uploads/logo_ab12.png',
      name: 'logo_ab12.png',
    });
    const item = {
      id: 'ci1',
      userDocumentId: 'u1',
      product: products.polo1,
      sizeAndColors: [
        {
          size: { name: 'M', value: 'M' },
          color: { name: 'MARINE', value: '#1b2a4a' },
          quantity: 20,
        },
      ],
      formAnswer: {
        form,
        answer: {
          data: { e1txt: 'ACME', e8logo: [] },
          metadata: answer.metadata,
          state: 'pending',
        },
      },
    } as unknown as CartItem;
    const onSaved = jest.fn();
    await act(async () => {
      root.render(
        <PersonalizeDialog
          item={item}
          required
          onClose={() => undefined}
          onSaved={onSaved}
        />
      );
    });
    await flush();
    const input = document.querySelector(
      '[role="dialog"] input[type="file"]'
    ) as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(input, 'files', {
        value: [new File(['png'], 'logo.png', { type: 'image/png' })],
        configurable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    const valider = [
      ...document.querySelectorAll('[role="dialog"] button'),
    ].find((b) => /Valider/.test(b.textContent || '')) as HTMLButtonElement;
    await act(async () => {
      valider.click();
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    const saved = onSaved.mock.calls[0][0];
    expect(saved.answer.state).toBe('submitted');
    expect(saved.answer.data.e1txt).toBe('ACME');
    expect(saved.answer.metadata).toEqual(answer.metadata);
  });
});

// ── Fiche commande (admin/producteur) : badge « Rempli avec l'assistant » ─────

describe('ShowOrderItem — badge « Rempli avec l’assistant »', () => {
  const renderOrderItem = async (formAnswer: unknown, id = 'oi1') => {
    mockOrderItem.mockReturnValue({
      documentId: id,
      product: {
        ...(products.polo1 as object),
        images: [{ url: 'https://x/p.png' }],
        description: '',
      },
      sizeAndColorSelections: [
        {
          size: { name: 'M', value: 'M' },
          color: { name: 'MARINE', value: '#1b2a4a' },
          quantity: 20,
        },
      ],
      formAnswer,
    });
    await act(async () => {
      root.render(
        <Provider store={appStore}>
          <MemoryRouter key={id} initialEntries={[`/common/order-item/${id}`]}>
            <Routes>
              <Route
                path="/common/order-item/:documentId"
                element={<ShowOrderItem />}
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );
    });
    await flush();
  };

  it('réponse remplie avec l’assistant (source + filledAt) → badge', async () => {
    await renderOrderItem({ documentId: 'fa1', form, answer });
    expect(container.textContent).toContain('Voir les détails du produit');
    expect(container.textContent).toContain("Rempli avec l'assistant");
  });

  it('réponse « en attente » d’une offre ajoutée telle quelle (source seule) ou remplie sur la fiche → pas de badge', async () => {
    await renderOrderItem({
      documentId: 'fa1',
      form,
      answer: { data: {}, metadata: { source: 'assistant' }, state: 'pending' },
    });
    expect(container.textContent).toContain('Voir les détails du produit');
    expect(container.textContent).not.toContain("Rempli avec l'assistant");
    await renderOrderItem(
      {
        documentId: 'fa2',
        form,
        answer: { data: {}, metadata: {}, state: 'submitted' },
      },
      'oi2'
    );
    expect(container.textContent).toContain('Voir les détails du produit');
    expect(container.textContent).not.toContain("Rempli avec l'assistant");
    // Contrôle : la même page affiche bien le badge dès que la trace est complète.
    await renderOrderItem({ documentId: 'fa3', form, answer }, 'oi3');
    expect(container.textContent).toContain("Rempli avec l'assistant");
  });
});
