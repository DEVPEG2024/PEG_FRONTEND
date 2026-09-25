/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatOfferAction from '@/components/template/ChatOfferAction';
import type { ChatOffer } from '@/components/template/chatOffer';
import type { CartItem } from '@/@types/cart';

// Parcours réel « clic sur Ajouter au panier » : vrai reducer du panier, seul le
// chargement du produit (GraphQL) est simulé. Régression visée : l'offre du chat
// doit ENTRER dans le panier, y compris un produit à personnaliser (Bonnet).

// React 18 : signale à React que act() est géré par le test (sinon avertissement).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const products: Record<string, unknown> = {
  bonnet: {
    documentId: 'bonnet', name: 'Bonnet', pricingMode: 'tiers', priceTiers: [{ minQuantity: 1, price: 8 }],
    sizes: [{ documentId: 'tu', name: 'TU', value: 'TU' }],
    colors: [{ documentId: 'noir', name: 'NOIR', value: '#000' }, { documentId: 'rouge', name: 'ROUGE', value: '#f00' }],
    form: { documentId: 'f44', fields: [{ type: 'file', label: 'Logo', input: true }] },
  },
  tshirt: {
    documentId: 'tshirt', name: 'T-shirt', pricingMode: 'tiers', priceTiers: [{ minQuantity: 1, price: 5 }],
    sizes: [{ documentId: 's', name: 'S', value: 'S' }, { documentId: 'm', name: 'M', value: 'M' }],
    colors: [{ documentId: 'blanc', name: 'BLANC', value: '#fff' }],
    form: { documentId: 'f53', fields: [] },
  },
};

jest.mock('@/services/ProductServices', () => ({
  apiGetProductForShowById: (id: string) =>
    Promise.resolve({ data: { data: { product: products[id] } } }),
}));

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({ user: () => ({ user: { documentId: 'u1' } }) }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });

const offerOf = (lines: ChatOffer['lines']): ChatOffer => ({ id: 'o1', lines, totalHT: 100, totalTTC: 120 });

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderAndClick = async (offer: ChatOffer) => {
  const store = makeStore();
  const onGo = jest.fn();
  const onChange = jest.fn();
  await act(async () => {
    root.render(
      <Provider store={store}>
        <ChatOfferAction offer={offer} onChange={onChange} onGo={onGo} />
      </Provider>,
    );
  });
  const button = container.querySelector('button[aria-label="Ajouter l\'offre au panier"]') as HTMLButtonElement;
  expect(button).not.toBeNull();
  await act(async () => { button.click(); });
  // laisse se résoudre le chargement (simulé) des produits
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return { cart: (store.getState() as { base: { cart: { cart: CartItem[] } } }).base.cart.cart, onGo, onChange };
};

describe('ChatOfferAction — l’offre entre dans le panier', () => {
  it('produit à personnaliser (10 bonnets noirs) → dans le panier, personnalisation en attente, ouverture du panier', async () => {
    const { cart, onGo, onChange } = await renderAndClick(offerOf([
      { productDocumentId: 'bonnet', productName: 'Bonnet', quantity: 10, colorDocumentId: 'noir', colorName: 'NOIR', totalHT: 80 },
    ]));
    expect(cart).toHaveLength(1);
    expect(cart[0].userDocumentId).toBe('u1');
    expect(cart[0].sizeAndColors).toEqual([expect.objectContaining({ quantity: 10, size: expect.objectContaining({ name: 'TU' }), color: expect.objectContaining({ name: 'NOIR' }) })]);
    expect((cart[0].formAnswer as unknown as { answer: { state: string } }).answer.state).toBe('pending');
    // Bonnet à personnaliser : le panier ouvrira directement la pop-up « Ajoutez votre logo ».
    expect(onGo).toHaveBeenCalledWith('/customer/cart', { openPersonalization: true });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'added' }));
  });

  it('tailles à répartir (10 t-shirts sans taille) → fiche pré-remplie, rien d’ajouté', async () => {
    const { cart, onGo } = await renderAndClick(offerOf([
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 10, totalHT: 50 },
    ]));
    expect(cart).toHaveLength(0);
    expect(onGo).toHaveBeenCalledWith('/customer/product/tshirt', { chatOffer: expect.objectContaining({ quantity: 10 }) });
  });

  it('répartition « 5 S et 5 M » → UNE ligne de panier à deux tailles (palier sur 10)', async () => {
    const { cart } = await renderAndClick(offerOf([
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 5, sizeDocumentId: 's', sizeName: 'S', totalHT: 25 },
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 5, sizeDocumentId: 'm', sizeName: 'M', totalHT: 25 },
    ]));
    expect(cart).toHaveLength(1);
    expect(cart[0].sizeAndColors.map((x) => `${x.quantity} ${x.size.name}`)).toEqual(['5 S', '5 M']);
  });

  it('taille et couleur connues (10 t-shirts M) → dans le panier directement', async () => {
    const { cart } = await renderAndClick(offerOf([
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 10, sizeDocumentId: 'm', sizeName: 'M', totalHT: 50 },
    ]));
    expect(cart).toHaveLength(1);
    expect(cart[0].sizeAndColors[0].size.name).toBe('M');
    expect(cart[0].sizeAndColors[0].color.name).toBe('BLANC');
  });
});
