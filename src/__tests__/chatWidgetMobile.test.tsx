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

// Assistant client sur TÉLÉPHONE (demandes du 25/09/2026) : petit bouton dans
// l'en-tête, à gauche du panier, AFFICHÉ EN PERMANENCE et qui pulse sans arrêt
// (l'ancien cycle « 7 s visible toutes les 30 s » le faisait disparaître) ;
// le chat s'ouvre en plein écran.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jest.mock est remonté avant les imports : ChatWidget reçoit le faux useResponsive.
let phone = true;
jest.mock('@/utils/hooks/useResponsive', () => () => ({ smaller: { md: phone }, larger: { md: !phone } }));

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

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
  phone = true;
});

const render = (path = '/home') =>
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={[path]}>
          <ChatWidget />
        </MemoryRouter>
      </Provider>,
    );
  });

const launcher = () => container.querySelector('button[aria-label="Ouvrir le chat assistant"]') as HTMLButtonElement | null;
// Visible = présent, et ni masqué aux lecteurs d'écran ni retiré du clavier.
const launcherShown = () => {
  const btn = launcher();
  return !!btn && !btn.closest('[aria-hidden="true"]') && btn.tabIndex !== -1;
};
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

const addHeaderSlot = () => {
  const slot = document.createElement('span');
  slot.id = 'peg-chat-header-slot';
  document.body.appendChild(slot);
  return slot;
};
const slotWrapperWidth = (slot: HTMLElement) =>
  ((slot.querySelector('button[aria-label="Ouvrir le chat assistant"]')?.parentElement as HTMLElement | null)?.style.width);

describe('ChatWidget — téléphone, bouton dans l’en-tête (à gauche du panier)', () => {
  afterEach(() => document.getElementById('peg-chat-header-slot')?.remove());

  it('se place dans l’en-tête et y reste en permanence, en pulsant', () => {
    const slot = addHeaderSlot();
    render();
    expect(slot.querySelector('button[aria-label="Ouvrir le chat assistant"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Ouvrir le chat assistant"]')).toBeNull(); // pas de bouton flottant
    const stillThere = () => {
      const btn = slot.querySelector('button[aria-label="Ouvrir le chat assistant"]') as HTMLButtonElement;
      expect(slotWrapperWidth(slot)).toBe('40px');           // jamais replié
      expect(btn.style.animation).toContain('peg-chat-halo'); // pulse toujours
    };
    stillThere();                    // 0 s
    advance(7_100); stillThere();    // 7,1 s : l'ancien cycle le repliait ici
    advance(22_900); stillThere();   // 30 s
    advance(90_000); stillThere();   // 2 min
  });

  it('pulse, s’ouvre en plein écran, et reste disponible pendant la commande', () => {
    const slot = addHeaderSlot();
    render('/customer/cart');
    const btn = slot.querySelector('button[aria-label="Ouvrir le chat assistant"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.style.animation).toContain('peg-chat-halo');
    act(() => { btn.click(); });
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.width).toBe('100vw');
  });

  it('toujours cliquable et atteignable au clavier', () => {
    const slot = addHeaderSlot();
    render();
    advance(45_000);
    const btn = slot.querySelector('button[aria-label="Ouvrir le chat assistant"]') as HTMLButtonElement;
    expect(btn.style.pointerEvents).not.toBe('none');
    expect(btn.tabIndex).toBe(0);
    expect(btn.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('ChatWidget — téléphone sans en-tête (repli flottant)', () => {
  it('bouton flottant, lui aussi affiché en permanence', () => {
    render();
    expect(launcherShown()).toBe(true);
    advance(7_100);
    expect(launcherShown()).toBe(true);
    advance(60_000);
    expect(launcherShown()).toBe(true);
  });

  it('ouvre le chat en plein écran et fige la page derrière', () => {
    render();
    act(() => { launcher()!.click(); });
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');
    act(() => { (container.querySelector('button[aria-label="Fermer le chat"]') as HTMLButtonElement).click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('masqué pendant la commande (il recouvrirait les boutons)', () => {
    render('/customer/cart');
    expect(launcher()).toBeNull();
  });
});

describe('ChatWidget — ordinateur', () => {
  it('bouton flottant toujours visible, fenêtre inchangée', () => {
    phone = false;
    addHeaderSlot(); // l'emplacement n'existe que sur téléphone, mais ne doit rien changer ici
    render();
    advance(40_000);
    expect(launcherShown()).toBe(true);
    act(() => { launcher()!.click(); });
    expect((container.querySelector('[role="dialog"]') as HTMLElement).style.position).toBe('absolute');
    document.getElementById('peg-chat-header-slot')?.remove();
  });
});
