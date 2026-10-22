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
  // Offres ESDL DOUVAINE (prod, 22/10/2026) : une seule couleur pour la casquette.
  casquette: {
    documentId: 'casquette', name: 'Casquette ESDL', pricingMode: 'tiers', priceTiers: [{ minQuantity: 1, price: 12.5 }, { minQuantity: 10, price: 11.3 }],
    sizes: [{ documentId: 'tu', name: 'Taille unique', value: 'Taille unique' }],
    colors: [{ documentId: 'noir', name: 'NOIR', value: '#000000' }],
    form: null,
  },
  bonnetEsdl: {
    documentId: 'bonnetEsdl', name: 'Bonnet ESDL', pricingMode: 'tiers', priceTiers: [{ minQuantity: 1, price: 21.04 }, { minQuantity: 10, price: 12.5 }],
    sizes: [{ documentId: 'tu', name: 'Taille unique', value: 'Taille unique' }],
    colors: [{ documentId: 'noir', name: 'NOIR', value: '#000000' }, { documentId: 'rouge', name: 'ROUGE', value: '#ec0e0e' }],
    form: null,
  },
  polo: {
    documentId: 'polo', name: 'Polo', pricingMode: 'tiers', priceTiers: [{ minQuantity: 1, price: 15 }],
    sizes: [{ documentId: 'l', name: 'L', value: 'L' }, { documentId: 's', name: 'S', value: 'S' }],
    colors: [{ documentId: 'marine', name: 'MARINE', value: '#1b2a4a' }, { documentId: 'blanc', name: 'BLANC', value: '#fff' }],
    form: null,
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
  const cartOf = () => (store.getState() as { base: { cart: { cart: CartItem[] } } }).base.cart.cart;
  return { cart: cartOf(), cartOf, onGo, onChange };
};

/** Texte de la question posée sous l'offre, ou null. */
const questionText = () => container.querySelector('[role="group"]')?.textContent ?? null;
const click = async (label: string | RegExp) => {
  const b = [...container.querySelectorAll('button')].find((x) => (typeof label === 'string' ? x.textContent?.trim() === label : label.test(x.textContent ?? '')));
  expect(b).toBeDefined();
  await act(async () => { b!.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};
const qty = (item: CartItem) => item.sizeAndColors.map((x) => `${x.quantity} ${x.size.name} ${x.color.name}`);

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

  it('taille non dite (10 t-shirts) → la taille est demandée DANS le chat, un clic → panier', async () => {
    const { cart, cartOf, onGo } = await renderAndClick(offerOf([
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 10, totalHT: 50 },
    ]));
    expect(cart).toHaveLength(0);
    expect(onGo).not.toHaveBeenCalled();
    expect(questionText()).toContain('Quelle taille pour vos 10 pièces');
    await click('M');
    expect(cartOf()).toHaveLength(1);
    expect(qty(cartOf()[0])).toEqual(['10 M BLANC']);
    // T-shirt à personnaliser : le panier ouvre la pop-up logo, comme une offre complète.
    expect(onGo).toHaveBeenCalledWith('/customer/cart', { openPersonalization: true });
  });

  it('plusieurs tailles voulues → « Répartir sur la fiche » ouvre la fiche pré-remplie', async () => {
    const { cartOf, onGo } = await renderAndClick(offerOf([
      { productDocumentId: 'tshirt', productName: 'T-shirt', quantity: 10, totalHT: 50 },
    ]));
    await click(/Répartir sur la fiche/);
    expect(cartOf()).toHaveLength(0);
    expect(onGo).toHaveBeenCalledWith('/customer/product/tshirt', { chatOffer: expect.objectContaining({ quantity: 10 }) });
  });

  it('cas ESDL : 10 Bonnet ESDL (2 couleurs) + 10 Casquette ESDL → couleur demandée, rien ne sort du chat, puis les DEUX au panier', async () => {
    const { cart, cartOf, onGo } = await renderAndClick(offerOf([
      { productDocumentId: 'bonnetEsdl', productName: 'Bonnet ESDL', quantity: 10, totalHT: 125 },
      { productDocumentId: 'casquette', productName: 'Casquette ESDL', quantity: 10, totalHT: 113 },
    ]));
    // Avant : la casquette entrait seule et la fiche du bonnet s'ouvrait avec 0 pièce.
    expect(cart).toHaveLength(0);
    expect(onGo).not.toHaveBeenCalled();
    expect(questionText()).toContain('Quelle couleur pour vos 10 pièces');
    expect(questionText()).toContain('Bonnet ESDL');
    expect(container.querySelector('button[aria-label="Ajouter l\'offre au panier"]')).toBeNull();
    await click('ROUGE');
    const items = cartOf();
    expect(items.map((i) => i.product.name)).toEqual(['Bonnet ESDL', 'Casquette ESDL']);
    expect(qty(items[0])).toEqual(['10 Taille unique ROUGE']);
    expect(qty(items[1])).toEqual(['10 Taille unique NOIR']);
    expect(onGo).toHaveBeenCalledTimes(1);
    expect(onGo).toHaveBeenCalledWith('/customer/cart', undefined);
  });

  it('taille ET couleur manquantes → couleur puis taille, puis panier (aucune fiche)', async () => {
    const { cartOf, onGo, onChange } = await renderAndClick(offerOf([
      { productDocumentId: 'polo', productName: 'Polo', quantity: 6, totalHT: 90 },
    ]));
    expect(questionText()).toContain('Quelle couleur pour vos 6 pièces');
    await click('MARINE');
    expect(cartOf()).toHaveLength(0);
    expect(questionText()).toContain('Quelle taille pour vos 6 pièces');
    // Tailles dans l'ordre naturel, pas dans l'ordre de la base.
    expect([...container.querySelectorAll('[role="group"] button')].map((b) => b.textContent?.trim()).slice(0, 2)).toEqual(['S', 'L']);
    await click('L');
    expect(qty(cartOf()[0])).toEqual(['6 L MARINE']);
    expect(onGo).toHaveBeenCalledWith('/customer/cart', undefined);
    // L'offre mémorisée dans le message porte la couleur et la taille choisies.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'added' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lines: [expect.objectContaining({ colorName: 'MARINE', sizeName: 'L' })] }));
  });

  it('couleur demandée introuvable (« VIOLET ») → reposée dans le chat, remplacée par le choix', async () => {
    const { cartOf } = await renderAndClick(offerOf([
      { productDocumentId: 'bonnetEsdl', productName: 'Bonnet ESDL', quantity: 3, requestedColor: 'VIOLET', totalHT: 63 },
    ]));
    expect(questionText()).toContain('Quelle couleur pour vos 3 pièces');
    await click('NOIR');
    expect(qty(cartOf()[0])).toEqual(['3 Taille unique NOIR']);
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
