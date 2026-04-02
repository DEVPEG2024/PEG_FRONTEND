// Service Worker for PEG Push Notifications

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'PEG', message: event.data?.text() || 'Nouvelle notification' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'PEG', {
      body: data.message || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: { link: data.link || '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if possible
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      // Open new tab
      return clients.openWindow(link);
    })
  );
});
