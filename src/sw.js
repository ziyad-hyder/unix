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

// 2. NetworkFirst Runtime Caching for API endpoints (preserves existing buildId logic)
const buildId = import.meta.env.VITE_BUILD_ID || 'v1';
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const cleanApiUrl = apiUrl ? apiUrl.replace(/\/+$/, '') : '';

registerRoute(
  ({ url, request }) => {
    if (request.method !== 'GET') return false;
    return (
      url.pathname.startsWith('/api/') ||
      (cleanApiUrl && url.href.startsWith(cleanApiUrl))
    );
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
