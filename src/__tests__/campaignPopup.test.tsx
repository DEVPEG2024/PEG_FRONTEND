/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ClientCampaign } from '@/@types/campaign';

// Pop-up des campagnes côté client : ce qui compte pour les statistiques
// (ouverture comptée à l'affichage, clic, fermeture) et pour le client (jamais
// pendant un paiement, rien si le serveur n'a pas encore la fonctionnalité).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockGet = jest.fn();
const mockTrack = jest.fn(() => Promise.resolve({ data: { result: true } }));
jest.mock('@/services/CampaignServices', () => ({
  apiGetMyCampaigns: () => mockGet(),
  apiTrackCampaign: (...args: unknown[]) => (mockTrack as (...a: unknown[]) => Promise<unknown>)(...args),
}));
// Animations : vérifiées dans un vrai navigateur. Ici, éléments simples, sortie immédiate.
jest.mock('framer-motion', () => {
  const React = jest.requireActual('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout']);
  const cache: Record<string, unknown> = {};
  const motion = new Proxy({}, {
    get: (_t, tag: string) =>
      (cache[tag] ||= React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
        React.createElement(tag, { ...Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k))), ref }))),
  });
  return { motion, AnimatePresence: ({ children }: { children: unknown }) => children, useReducedMotion: () => false };
});
jest.mock('@/store', () => ({
  useAppSelector: (fn: (s: unknown) => unknown) => jest.requireActual('react-redux').useSelector(fn),
}));

// eslint-disable-next-line import/first
import CampaignPopup from '@/components/template/CampaignPopup';

const campaign = (over: Partial<ClientCampaign> = {}): ClientCampaign => ({
  id: 7, title: 'Nouvelle collection', message: 'Découvrez **nos nouveautés**', tag: 'nouveaute',
  images: [{ id: 1, url: 'https://s3.exemple/cover.jpg', width: 1200, height: 630, name: 'cover' }],
  ctaLabel: 'Voir le catalogue', ctaUrl: '/customer/catalogue',
  receivedAt: new Date().toISOString(), expiresAt: null, openedAt: null, clickedAt: null, dismissedAt: null,
  popup: true, popupDelay: 0, popupDuration: null, popupDays: null, popupAnimation: 'zoom', isTest: false, ...over,
});

const store = () =>
  configureStore({
    reducer: combineReducers({ base: combineReducers({ notification: () => ({ notifications: [] }) }) }),
  });

const Where = () => <span data-testid="where">{useLocation().pathname}</span>;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  mockGet.mockReset();
  mockTrack.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

const mount = async (path = '/home') => {
  await act(async () => {
    root.render(
      <Provider store={store()}>
        <MemoryRouter initialEntries={[path]}>
          <CampaignPopup />
          <Routes><Route path="*" element={<Where />} /></Routes>
        </MemoryRouter>
      </Provider>,
    );
  });
  // Chargement différé (1,2 s) puis résolution de la requête.
  await act(async () => { jest.advanceTimersByTime(1300); });
  await act(async () => { await Promise.resolve(); });
};

const dialog = () => document.querySelector('[role="dialog"]');
const button = (label: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label) as HTMLButtonElement;

test('affiche la campagne et compte l’ouverture (canal pop-up)', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount();
  expect(dialog()?.textContent).toContain('Nouvelle collection');
  expect(dialog()?.querySelector('strong')?.textContent).toBe('nos nouveautés');
  expect(mockTrack).toHaveBeenCalledWith(7, 'open', 'popup');
});

test('« Fermer » compte la fermeture et masque la pop-up', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount();
  await act(async () => { button('Fermer').click(); });
  expect(mockTrack).toHaveBeenCalledWith(7, 'dismiss', 'popup');
  expect(dialog()).toBeNull();
});

test('le bouton d’action compte le clic et ouvre la page de l’espace client', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount();
  await act(async () => { button('Voir le catalogue').click(); });
  expect(mockTrack).toHaveBeenCalledWith(7, 'click', 'popup');
  expect(document.querySelector('[data-testid="where"]')?.textContent).toBe('/customer/catalogue');
  expect(dialog()).toBeNull();
});

test('une seule pop-up par visite : la suivante attend la visite d’après', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign(), campaign({ id: 8, title: 'Promo de rentrée' })], campaigns: [], unread: 2 } });
  await mount();
  await act(async () => { button('Fermer').click(); });
  expect(dialog()).toBeNull();
  expect(mockTrack).not.toHaveBeenCalledWith(8, 'open', 'popup');

  // Nouvelle visite (nouvel onglet) : la seconde campagne s'affiche.
  act(() => root.unmount());
  sessionStorage.removeItem('peg_campaign_popup_visit');
  root = createRoot(container);
  mockGet.mockResolvedValue({ data: { popups: [campaign({ id: 8, title: 'Promo de rentrée' })], campaigns: [], unread: 1 } });
  await mount();
  expect(dialog()?.textContent).toContain('Promo de rentrée');
  expect(mockTrack).toHaveBeenCalledWith(8, 'open', 'popup');
});

test('jamais pendant un paiement : rien d’affiché ni de compté sur le panier', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount('/customer/cart');
  expect(dialog()).toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();
});

test('déjà montrée sur cet appareil : plus jamais ici, même dans un nouvel onglet', async () => {
  localStorage.setItem('peg_campaign_popup_device:anonyme', JSON.stringify([7]));
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount();
  expect(dialog()).toBeNull();
});

test('déjà vue sur un autre appareil (ouverte côté serveur) : s’affiche une fois sur celui-ci', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign({ openedAt: new Date().toISOString(), clickedAt: new Date().toISOString() })], campaigns: [], unread: 0 } });
  await mount();
  expect(dialog()?.textContent).toContain('Nouvelle collection');
  expect(JSON.parse(localStorage.getItem('peg_campaign_popup_device:anonyme') || '[]')).toEqual([7]);
});

test('la mémoire de l’appareil est propre à chaque compte', async () => {
  localStorage.setItem('peg_campaign_popup_device:un-autre-compte', JSON.stringify([7]));
  mockGet.mockResolvedValue({ data: { popups: [campaign()], campaigns: [], unread: 1 } });
  await mount();
  expect(dialog()).not.toBeNull();
});

test('serveur sans la fonctionnalité (405) : aucune erreur, rien d’affiché', async () => {
  mockGet.mockRejectedValue({ response: { status: 405 } });
  await mount();
  expect(dialog()).toBeNull();
});

test('délai d’apparition : la pop-up attend le nombre de secondes réglé', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign({ popupDelay: 5 })], campaigns: [], unread: 1 } });
  await mount(); // 1,3 s écoulées
  expect(dialog()).toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(dialog()).toBeNull();
  await act(async () => { jest.advanceTimersByTime(800); });
  expect(dialog()?.textContent).toContain('Nouvelle collection');
  expect(mockTrack).toHaveBeenCalledWith(7, 'open', 'popup');
});

test('durée d’affichage : fermeture automatique, sans compter de fermeture', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign({ popupDuration: 8 })], campaigns: [], unread: 1 } });
  await mount();
  expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
  await act(async () => { jest.advanceTimersByTime(7000); });
  expect(dialog()).not.toBeNull();
  await act(async () => { jest.advanceTimersByTime(1200); });
  expect(dialog()).toBeNull();
  expect(mockTrack).not.toHaveBeenCalledWith(7, 'dismiss', 'popup');
});

test('durée d’affichage : le décompte s’arrête pendant que le client survole', async () => {
  mockGet.mockResolvedValue({ data: { popups: [campaign({ popupDuration: 5 })], campaigns: [], unread: 1 } });
  await mount();
  const el = dialog() as HTMLElement;
  // jsdom n'a pas PointerEvent : React écoute l'événement natif « pointerover ».
  await act(async () => { el.dispatchEvent(new MouseEvent('pointerover', { bubbles: true })); });
  await act(async () => { jest.advanceTimersByTime(10_000); });
  expect(dialog()).not.toBeNull();
});
