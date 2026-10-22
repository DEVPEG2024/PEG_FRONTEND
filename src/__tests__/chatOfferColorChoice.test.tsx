/**
 * @jest-environment jsdom
 */
// Store de l'application chargé EN PREMIER (cycle d'imports cartSlice → store de la
// fiche → @/store, cf. chatOfferForm.test.tsx).
import appStore from '@/store';
import ShowProduct from '@/views/app/customer/products/show/ShowProduct';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ChatFormAnswer } from '@/components/template/chat/chatFormTypes';
import type { CartItem } from '@/@types/cart';

// Cas signalé le 22/10/2026 : « 3 bonnets » dans le chat, logo envoyé, puis la fiche
// s'ouvre (le bonnet a 9 couleurs, aucune dite) SANS la quantité — le client la
// ressaisissait. La fiche propose désormais les couleurs en un clic et y pose les 3.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = jest.fn();

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/utils/hooks/useResponsive', () => () => ({
  smaller: { md: false },
  larger: { md: true },
}));
jest.mock('@/components/shared', () => ({ RichTextEditor: () => null }));
jest.mock('@/components/shared/ProductImageCarousel', () => () => null);

const form = {
  documentId: 'form1',
  name: 'Personnalisation du produit',
  fields: [{ id: 'e8logo', type: 'file', label: 'Votre logo', input: true }],
};
const bonnet = {
  documentId: 'bonnet1',
  name: 'Bonnet',
  pricingMode: 'tiers',
  priceTiers: [{ minQuantity: 1, price: 14 }],
  sizes: [{ documentId: 'tu', name: 'Taille unique', value: 'Taille unique' }],
  colors: [
    { documentId: 'noir', name: 'NOIR', value: '#000000' },
    { documentId: 'grey', name: 'HEATHER GREY', value: '#000000' },
    { documentId: 'rouge', name: 'ROUGE', value: '#c00000' },
  ],
  form,
};
jest.mock('@/services/ProductServices', () => ({
  apiGetProductForShowById: () => Promise.resolve({ data: { data: { product: bonnet } } }),
}));

const answer: ChatFormAnswer = {
  data: {
    e8logo: [{ storage: 'url', name: 'logo.png', originalName: 'logo.png', url: 'https://x.s3.amazonaws.com/logo.png', size: 2048, type: 'image/png' }],
  },
  metadata: { source: 'assistant', filledAt: '2026-10-22T20:54:15.000Z', conversationId: 'c1' },
  state: 'submitted',
};
const chatOffer = {
  offerId: 'o1-perso',
  quantity: 3,
  lines: [{ productDocumentId: 'bonnet1', productName: 'Bonnet', quantity: 3, totalHT: 35.7 }],
  answer,
};

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
const button = (label: string | RegExp) =>
  [...container.querySelectorAll('button')].find((b) =>
    typeof label === 'string' ? b.textContent?.trim() === label : label.test(b.textContent || '')
  ) as HTMLButtonElement;
const click = (b: HTMLButtonElement) => act(async () => { b.click(); });

describe('ShowProduct — couleur à choisir après une offre du chat', () => {
  it('propose les couleurs, y pose la quantité de l’offre, et l’article part au panier avec 3 pièces', async () => {
    await act(async () => {
      root.render(
        <Provider store={appStore}>
          <MemoryRouter initialEntries={[{ pathname: '/customer/product/bonnet1', state: { chatOffer } }]}>
            <Routes>
              <Route path="/customer/product/:documentId" element={<ShowProduct />} />
              <Route path="/customer/cart" element={<div data-testid="panier" />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );
    });
    await flush();

    expect(container.textContent).toContain('Couleur de vos 3 pièces');
    expect(container.textContent).toContain('Choisissez ci-dessous');
    const group = container.querySelector('[role="group"][aria-label="Couleur de vos 3 pièces"]')!;
    expect([...group.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['NOIR', 'HEATHER GREY', 'ROUGE']);

    // NOIR puis HEATHER GREY (même code hex : distinguées par documentId).
    await click(button('NOIR'));
    expect(button('NOIR').getAttribute('aria-pressed')).toBe('true');
    await click(button('HEATHER GREY'));
    expect(button('NOIR').getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).toContain('Quantité, tailles et couleurs reprises de la conversation.');

    // Logo déjà envoyé dans le chat : formulaire complet → récapitulatif → panier.
    await click(button('Remplir le formulaire'));
    await click(button('Récapitulatif'));
    const add = button(/Ajouter au panier/);
    expect(add.disabled).toBe(false);
    await click(add);
    await flush();

    const cart = (appStore.getState() as unknown as { base: { cart: { cart: CartItem[] } } }).base.cart.cart;
    const item = cart[cart.length - 1];
    expect(item.sizeAndColors.map((s) => `${s.quantity} ${s.size.name} ${s.color.name}`)).toEqual(['3 Taille unique HEATHER GREY']);
    expect((item.formAnswer as unknown as { answer: ChatFormAnswer }).answer).toEqual(answer);
    expect(container.querySelector('[data-testid="panier"]')).not.toBeNull();
  });
});
