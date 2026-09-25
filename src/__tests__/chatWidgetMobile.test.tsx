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

// Assistant client sur TÉLÉPHONE (demande du 25/09/2026) : le bouton apparaît en
// pulsant 5 s toutes les 15 s, et le chat s'ouvre en plein écran.

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
const launcherShown = () => (launcher()?.parentElement as HTMLElement | null)?.style.opacity === '1';
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

describe('ChatWidget — téléphone', () => {
  it('le bouton apparaît 5 s toutes les 15 s', () => {
    render();
    expect(launcher()).not.toBeNull();
    expect(launcherShown()).toBe(true);          // 0 s : visible
    advance(4_900);
    expect(launcherShown()).toBe(true);          // 4,9 s : encore visible
    advance(200);
    expect(launcherShown()).toBe(false);         // 5,1 s : masqué
    advance(9_800);
    expect(launcherShown()).toBe(false);         // 14,9 s : toujours masqué
    advance(200);
    expect(launcherShown()).toBe(true);          // 15,1 s : réapparaît
    advance(5_000);
    expect(launcherShown()).toBe(false);         // 20,1 s : masqué à nouveau
  });

  it('pulse pendant son apparition et n’est pas cliquable masqué', () => {
    render();
    expect(launcher()!.style.animation).toContain('peg-chat-pop');
    advance(5_100);
    expect((launcher()!.parentElement as HTMLElement).style.pointerEvents).toBe('none');
    expect(launcher()!.tabIndex).toBe(-1);
  });

  it('ouvre le chat en plein écran et fige la page derrière', () => {
    render();
    act(() => { launcher()!.click(); });
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.width).toBe('100vw');
    expect(document.body.style.overflow).toBe('hidden');
    // le bouton flottant laisse la place : on ferme par la croix de l'en-tête
    expect(launcher()).toBeNull();
    act(() => { (container.querySelector('button[aria-label="Fermer le chat"]') as HTMLButtonElement).click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(launcherShown()).toBe(true);          // réapparaît aussitôt refermé
  });

  it('reste masqué sur les pages de commande (fiche, panier)', () => {
    render('/customer/cart');
    expect(launcher()).toBeNull();
  });

  it('ordinateur : bouton toujours visible, fenêtre flottante inchangée', () => {
    phone = false;
    render();
    advance(10_000);
    expect(launcherShown()).toBe(true);
    act(() => { launcher()!.click(); });
    expect((container.querySelector('[role="dialog"]') as HTMLElement).style.position).toBe('absolute');
  });
});
