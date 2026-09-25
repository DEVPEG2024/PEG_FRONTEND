/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import notificationReducer, { setNotifications, setUnreadCount, type NotificationItem } from '@/store/slices/base/notificationSlice';

// Campagne supprimée par l'admin : chaque navigateur client retire l'entrée de
// SA cloche (la notification vit dans peg-backend). Seule la campagne disparue
// est retirée ; rien ne bouge si la vérification échoue.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockKnown = jest.fn();
const mockDelete = jest.fn(() => Promise.resolve({}));
jest.mock('@/services/CampaignServices', () => ({ apiKnownCampaigns: (ids: number[]) => mockKnown(ids) }));
jest.mock('@/services/NotificationService', () => ({ deleteNotification: (id: string) => (mockDelete as (i: string) => Promise<unknown>)(id) }));
jest.mock('@/store', () => ({
  useAppSelector: (fn: (s: unknown) => unknown) => jest.requireActual('react-redux').useSelector(fn),
  useAppDispatch: () => jest.requireActual('react-redux').useDispatch(),
}));

// eslint-disable-next-line import/first
import useCampaignBellCleanup from '@/utils/hooks/useCampaignBellCleanup';

const notif = (id: string, eventType: string, campaignId?: number, read = false): NotificationItem => ({
  _id: id, eventType, title: id, message: '', link: '', read, metadata: campaignId ? { campaignId } : {}, createdAt: new Date().toISOString(),
});

const makeStore = () => configureStore({ reducer: combineReducers({ base: combineReducers({ notification: notificationReducer }) }) });
const Probe = () => { useCampaignBellCleanup(); return null; };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  mockKnown.mockReset();
  mockDelete.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });

const run = async (store: ReturnType<typeof makeStore>) => {
  await act(async () => { root.render(<Provider store={store}><Probe /></Provider>); });
  await act(async () => { jest.advanceTimersByTime(900); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

test('retire de la cloche la campagne supprimée, et elle seule', async () => {
  const store = makeStore();
  store.dispatch(setNotifications([notif('n1', 'campaign', 5), notif('n2', 'campaign', 6), notif('n3', 'new_ticket')]));
  store.dispatch(setUnreadCount(3));
  mockKnown.mockResolvedValue({ data: { existing: [5] } });
  await run(store);
  expect(mockKnown).toHaveBeenCalledWith([5, 6]);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith('n2');
  const state = store.getState().base.notification;
  expect(state.notifications.map((n) => n._id)).toEqual(['n1', 'n3']);
  expect(state.unreadCount).toBe(2);
});

test('vérification en échec : rien n’est retiré', async () => {
  const store = makeStore();
  store.dispatch(setNotifications([notif('n1', 'campaign', 5)]));
  mockKnown.mockRejectedValue(new Error('réseau'));
  await run(store);
  expect(mockDelete).not.toHaveBeenCalled();
  expect(store.getState().base.notification.notifications).toHaveLength(1);
});

test('aucune notification de campagne : aucun appel', async () => {
  const store = makeStore();
  store.dispatch(setNotifications([notif('n3', 'new_ticket')]));
  await run(store);
  expect(mockKnown).not.toHaveBeenCalled();
});
