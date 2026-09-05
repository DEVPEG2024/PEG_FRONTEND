// Service Worker for PEG Push Notifications

// ---------------------------------------------------------------------------
// Cache versionné (mise en cache PWA).
//
// RÈGLE ABSOLUE : ni la navigation ni index.html ne sont JAMAIS mis en cache.
// vercel.json impose `no-cache, no-store, must-revalidate` sur / et /index.html
// pour forcer le rechargement du dernier build : mettre la coque HTML en cache
// contredirait frontalement cet en-tête et servirait un build périmé.
// Seuls les assets Vite (/assets/, nom déjà haché donc immuable) et les icônes
// sont mis en cache. Les appels API (api.mypeg.fr, /peg-api, /graphql, upload)
// passent au réseau sans jamais être interceptés.
// ---------------------------------------------------------------------------

const CACHE_VERSION = 'peg-v1';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const KEEP_CACHES = [ASSET_CACHE];

// Chemins jamais interceptés : tout ce qui porte de la donnée métier.
const API_PATH_RE = /^\/(peg-api|api|graphql|upload)(\/|$)/;
// Assets Vite : nom haché par le build, donc immuables → cache-first sûr.
const HASHED_ASSET_RE = /^\/assets\//;
// Fichiers statiques non hachés → stale-while-revalidate (au pire un seul
// chargement de retard, jamais de code applicatif).
const STATIC_ASSET_RE =
  /^\/(android-chrome-[^/]+\.png|apple-touch-icon\.png|favicon[^/]*\.(png|ico)|img\/.+\.(png|jpe?g|svg|webp|gif))$/;

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>MyPEG</title>
<style>
html,body{margin:0;height:100%}
body{display:flex;align-items:center;justify-content:center;padding:24px;
background:#0f1c2e;color:#e8eefc;font-family:Inter,system-ui,-apple-system,sans-serif;text-align:center}
h1{font-size:20px;margin:0 0 8px}
p{font-size:15px;line-height:1.5;margin:0;opacity:.75}
</style></head>
<body><div><h1>Connexion indisponible</h1>
<p>Vérifiez votre connexion internet, puis réessayez.</p></div></body></html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      if (hit) return hit;
      throw error;
    });
  return hit || fresh;
}

self.addEventListener('install', (event) => {
  // Rien n'est préchargé : la coque HTML doit toujours venir du réseau.
  event.waitUntil(caches.open(ASSET_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KEEP_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Activation différée : le nouveau worker n'écrase l'ancien que lorsque
// l'utilisateur clique « Recharger » dans le bandeau de nouvelle version.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Navigation : RÉSEAU D'ABORD, sans jamais mettre la réponse en cache.
  // Repli hors-ligne : page minimale intégrée au worker, pas un build stocké.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => offlineResponse()));
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Autre origine (api.mypeg.fr, peg-backend, Stripe, S3…) : réseau direct.
  if (url.origin !== self.location.origin) return;
  // Donnée métier : jamais de cache.
  if (API_PATH_RE.test(url.pathname)) return;
  // Coque HTML et worker lui-même : jamais de cache.
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname === '/sw.js') return;

  if (HASHED_ASSET_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'PEG', message: event.data?.text() || 'Nouvelle notification' };
  }

  const tag = data.eventType || 'peg-notification';

  event.waitUntil(
    self.registration.showNotification(data.title || 'PEG', {
      body: data.message || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: tag,
      renotify: true,
      data: { link: data.link || '/' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Voir' },
        { action: 'dismiss', title: 'Fermer' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

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
