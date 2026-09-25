/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatWidget from '@/components/template/ChatWidget';

// « 10 bonnets noirs » dans le chat, puis clic sur la carte du produit : la fiche
// doit s'ouvrir avec la quantité et la couleur déjà remplies (state de navigation).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('@/utils/hooks/useResponsive', () => () => ({ smaller: { md: false }, larger: { md: true } }));

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({
        user: () => ({ user: { documentId: 'u1', firstName: 'Léa', lastName: 'Martin' } }),
        session: () => ({ token: 'jwt' }),
      }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });

let seen: unknown = null;
const ProductProbe = () => { seen = useLocation().state; return <div data-testid="fiche">fiche</div>; };

const url = `${window.location.origin}/customer/product/bonnet`;
const card = { url, kind: 'produit', title: 'Bonnet', meta: 'Dès 8,50 € HT' };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  seen = null;
  sessionStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

const renderWith = (messages: unknown[]) => {
  sessionStorage.setItem('peg_chat_widget_v2:u1', JSON.stringify({ conversationId: 'c1', messages }));
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route path="/home" element={<div />} />
            <Route path="/customer/product/:id" element={<ProductProbe />} />
          </Routes>
          <ChatWidget />
        </MemoryRouter>
      </Provider>,
    );
  });
  act(() => { (container.querySelector('button[aria-label="Ouvrir le chat assistant"]') as HTMLButtonElement).click(); });
};
const clickCard = () => act(() => {
  (container.querySelector('[role="dialog"] a[aria-label^="Bonnet"]') as HTMLAnchorElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
});

describe('ChatWidget — carte produit → fiche pré-remplie', () => {
  it('reprend quantité et couleur de l’offre, et referme le chat', () => {
    renderWith([
      { role: 'user', content: '10 bonnets noirs' },
      { role: 'assistant', content: `Total : 85 € HT\n[Bonnet](${url})`, cards: [card],
        offer: { id: 'o1', totalHT: 95, totalTTC: 114, lines: [{ productDocumentId: 'bonnet', productName: 'Bonnet', quantity: 10, colorDocumentId: 'noir', colorName: 'NOIR', totalHT: 85 }] } },
    ]);
    clickCard();
    expect(container.querySelector('[data-testid="fiche"]')).not.toBeNull();
    expect(seen).toEqual({ chatOffer: expect.objectContaining({ quantity: 10, lines: [expect.objectContaining({ colorDocumentId: 'noir' })] }) });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('carte d’un message ANTÉRIEUR à l’offre : utilise l’offre la plus récente', () => {
    renderWith([
      { role: 'user', content: 'bonnet ?' },
      { role: 'assistant', content: `Voici notre modèle 👇\n[Bonnet](${url})`, cards: [card] },
      { role: 'user', content: '10 noirs' },
      { role: 'assistant', content: 'Total : 85 € HT',
        offer: { id: 'o2', totalHT: 95, totalTTC: 114, lines: [{ productDocumentId: 'bonnet', productName: 'Bonnet', quantity: 10, colorDocumentId: 'noir', totalHT: 85 }] } },
    ]);
    clickCard();
    expect(seen).toEqual({ chatOffer: expect.objectContaining({ offerId: 'o2', quantity: 10 }) });
  });

  it('sans offre : simple navigation, sans pré-remplissage', () => {
    renderWith([
      { role: 'user', content: 'bonnet ?' },
      { role: 'assistant', content: `Voici notre modèle 👇\n[Bonnet](${url})`, cards: [card] },
    ]);
    clickCard();
    expect(container.querySelector('[data-testid="fiche"]')).not.toBeNull();
    expect(seen).toBeNull();
  });
});
