import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// 1. Workbox Precache (Injected by vite-plugin-pwa via self.__WB_MANIFEST)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// 2. NetworkFirst Runtime Caching for public listings ONLY (preserves existing buildId logic)
const buildId = import.meta.env.VITE_BUILD_ID || 'v1';
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const cleanApiUrl = apiUrl ? apiUrl.replace(/\/+$/, '') : '';

const EXCLUDED_API_PREFIXES = ['/api/auth', '/api/transactions', '/api/users', '/api/push'];

registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') return false;

    // Check if URL matches the API endpoints
    const isApi =
      url.pathname.startsWith('/api/') ||
      (cleanApiUrl && url.href.startsWith(cleanApiUrl));
    if (!isApi) return false;

    // Explicitly exclude authenticated endpoints from caching (straight to network)
    const isExcluded = EXCLUDED_API_PREFIXES.some(
      (prefix) => url.pathname.startsWith(prefix) || url.href.includes(prefix)
    );
    if (isExcluded) return false;

    // ONLY cache public listings requests (list and by-id)
    const isListings =
      url.pathname === '/api/listings' ||
      url.pathname.startsWith('/api/listings/') ||
      (cleanApiUrl && (
        url.href.startsWith(`${cleanApiUrl}/api/listings`) ||
        url.href.startsWith(`${cleanApiUrl}/listings`)
      ));

    return isListings;
  },
  new NetworkFirst({
    cacheName: `unix-api-${buildId}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 300,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 3. Purge cached auth / transaction / user / push entries on activate
self.addEventListener('activate', (event) => {
  const purgeOldEntries = async () => {
    const cacheNames = await caches.keys();
    const apiCacheNames = cacheNames.filter((name) => name.startsWith('unix-api-'));
    const prefixesToDelete = ['/api/auth', '/api/transactions', '/api/users', '/api/push'];

    for (const cacheName of apiCacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      for (const req of requests) {
        const reqUrl = new URL(req.url);
        const shouldDelete = prefixesToDelete.some((prefix) =>
          reqUrl.pathname.startsWith(prefix)
        );
        if (shouldDelete) {
          await cache.delete(req);
        }
      }
    }
  };

  event.waitUntil(purgeOldEntries());
});

// 4. Message Handler: Clear all API caches on demand (e.g. on logout)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_API_CACHES') {
    const clearApiCaches = async () => {
      const cacheNames = await caches.keys();
      const apiCacheNames = cacheNames.filter((name) => name.startsWith('unix-api-'));
      await Promise.all(apiCacheNames.map((name) => caches.delete(name)));
    };

    event.waitUntil(clearApiCaches());
  }
});

// 3. Web Push Event Handler
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      try {
        data = { body: event.data.text() };
      } catch {
        data = {};
      }
    }
  }

  const title = data.title || 'UniX Campus';
  const options = {
    body: data.body || 'You have a new update on UniX.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.svg',
    data: {
      url: data.url || (data.data && data.data.url) || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 4. Notification Click Event Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
