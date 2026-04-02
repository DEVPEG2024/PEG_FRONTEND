import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
  _id: string;
  eventType: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface NotificationState {
  unreadCount: number;
  notifications: NotificationItem[];
  hasMore: boolean;
  page: number;
  connectionStatus: 'connected' | 'polling' | 'disconnected';
}

const initialState: NotificationState = {
  unreadCount: 0,
  notifications: [],
  hasMore: true,
  page: 1,
  connectionStatus: 'disconnected',
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.notifications = action.payload;
      state.page = 1;
    },
    appendNotifications(state, action: PayloadAction<{ notifications: NotificationItem[]; hasMore: boolean }>) {
      const existingIds = new Set(state.notifications.map((n) => n._id));
      const newNotifs = action.payload.notifications.filter((n) => !existingIds.has(n._id));
      state.notifications.push(...newNotifs);
      state.hasMore = action.payload.hasMore;
      state.page += 1;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      const exists = state.notifications.some((n) => n._id === action.payload._id);
      if (!exists) {
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
      }
    },
    markAsRead(state, action: PayloadAction<string>) {
      const notif = state.notifications.find((n) => n._id === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
    removeNotification(state, action: PayloadAction<string>) {
      const idx = state.notifications.findIndex((n) => n._id === action.payload);
      if (idx !== -1) {
        if (!state.notifications[idx].read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(idx, 1);
      }
    },
    removeAllNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
      state.hasMore = false;
      state.page = 1;
    },
    setConnectionStatus(state, action: PayloadAction<'connected' | 'polling' | 'disconnected'>) {
      state.connectionStatus = action.payload;
    },
  },
});

export const {
  setUnreadCount,
  setNotifications,
  appendNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  removeAllNotifications,
  setConnectionStatus,
} = notificationSlice.actions;

export default notificationSlice.reducer;
