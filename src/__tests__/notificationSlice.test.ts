/**
 * Tests unitaires — reducer notifications (notificationSlice).
 *
 * CLAUDE.md signale la classe de bug « notifications perdues/dupliquées ».
 * On verrouille ici : dédoublonnage par `_id`, intégrité du compteur de
 * non-lus (jamais négatif, jamais décrémenté deux fois), pagination.
 *
 * Reducer pur → testé via reducer(state, action), sans mock.
 */

import reducer, {
  setUnreadCount,
  setNotifications,
  appendNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  removeAllNotifications,
  setConnectionStatus,
  NotificationItem,
  NotificationState,
} from '@/store/slices/base/notificationSlice';

// État initial obtenu via le reducer lui-même (initialState non exporté).
const init = (): NotificationState => reducer(undefined, { type: '@@INIT' } as any);

const notif = (id: string, read = false): NotificationItem =>
  ({
    _id: id,
    eventType: 'new_order',
    title: `t-${id}`,
    message: `m-${id}`,
    link: '',
    read,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
  });

describe('addNotification', () => {
  test('ajoute en tête et incrémente les non-lus', () => {
    let s = init();
    s = reducer(s, addNotification(notif('a')));
    expect(s.notifications.map((n) => n._id)).toEqual(['a']);
    expect(s.unreadCount).toBe(1);
    s = reducer(s, addNotification(notif('b')));
    expect(s.notifications.map((n) => n._id)).toEqual(['b', 'a']); // unshift
    expect(s.unreadCount).toBe(2);
  });

  test('doublon par _id → aucun ajout, aucun incrément', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, addNotification(notif('a')));
    expect(s.notifications).toHaveLength(1);
    expect(s.unreadCount).toBe(1);
  });

  test('notification déjà lue → n\'incrémente pas les non-lus', () => {
    const s = reducer(init(), addNotification(notif('a', true)));
    expect(s.notifications).toHaveLength(1);
    expect(s.unreadCount).toBe(0);
  });
});

describe('markAsRead — pas de double décrément', () => {
  test('marque lu et décrémente une fois', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, markAsRead('a'));
    expect(s.notifications[0].read).toBe(true);
    expect(s.unreadCount).toBe(0);
  });

  test('re-marquer une notif déjà lue ne décrémente pas', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, markAsRead('a'));
    s = reducer(s, markAsRead('a'));
    expect(s.unreadCount).toBe(0); // pas passé en négatif
  });

  test('id inconnu → aucun effet', () => {
    const s0 = reducer(init(), addNotification(notif('a')));
    const s1 = reducer(s0, markAsRead('zzz'));
    expect(s1.unreadCount).toBe(1);
  });
});

describe('markAllAsRead', () => {
  test('passe tout en lu et met le compteur à zéro', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, addNotification(notif('b')));
    s = reducer(s, markAllAsRead());
    expect(s.notifications.every((n) => n.read)).toBe(true);
    expect(s.unreadCount).toBe(0);
  });
});

describe('removeNotification', () => {
  test('supprime une non-lue → décrémente', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, addNotification(notif('b')));
    s = reducer(s, removeNotification('a'));
    expect(s.notifications.map((n) => n._id)).toEqual(['b']);
    expect(s.unreadCount).toBe(1);
  });

  test('supprime une lue → ne décrémente pas', () => {
    let s = reducer(init(), addNotification(notif('a', true)));
    s = reducer(s, removeNotification('a'));
    expect(s.notifications).toHaveLength(0);
    expect(s.unreadCount).toBe(0);
  });

  test('id inconnu → aucun effet', () => {
    const s0 = reducer(init(), addNotification(notif('a')));
    const s1 = reducer(s0, removeNotification('zzz'));
    expect(s1.notifications).toHaveLength(1);
    expect(s1.unreadCount).toBe(1);
  });
});

describe('appendNotifications — pagination + dédup', () => {
  test('n\'ajoute que les nouveaux _id, incrémente la page', () => {
    let s = reducer(init(), setNotifications([notif('a'), notif('b')]));
    expect(s.page).toBe(1);
    s = reducer(
      s,
      appendNotifications({ notifications: [notif('b'), notif('c')], hasMore: false })
    );
    expect(s.notifications.map((n) => n._id)).toEqual(['a', 'b', 'c']); // b non dupliqué
    expect(s.hasMore).toBe(false);
    expect(s.page).toBe(2);
  });
});

describe('setters divers', () => {
  test('setNotifications remplace et réinitialise la page', () => {
    let s = reducer(init(), appendNotifications({ notifications: [notif('a')], hasMore: true }));
    s = reducer(s, setNotifications([notif('x')]));
    expect(s.notifications.map((n) => n._id)).toEqual(['x']);
    expect(s.page).toBe(1);
  });

  test('setUnreadCount force la valeur', () => {
    expect(reducer(init(), setUnreadCount(7)).unreadCount).toBe(7);
  });

  test('removeAllNotifications vide tout', () => {
    let s = reducer(init(), addNotification(notif('a')));
    s = reducer(s, removeAllNotifications());
    expect(s.notifications).toHaveLength(0);
    expect(s.unreadCount).toBe(0);
    expect(s.hasMore).toBe(false);
    expect(s.page).toBe(1);
  });

  test('setConnectionStatus met à jour le statut', () => {
    expect(reducer(init(), setConnectionStatus('polling')).connectionStatus).toBe('polling');
  });
});
