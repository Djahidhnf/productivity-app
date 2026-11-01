// Klivr service worker: shows push reminders, opens the app on click, and shows
// an offline screen when a page can't load. Only that screen is ever cached, so
// no account data is stored here.

// Bump the version when offline.html changes, so the new copy gets cached.
const OFFLINE_CACHE = 'klivr-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.add(OFFLINE_URL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('klivr-offline-') && name !== OFFLINE_CACHE).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Only full page loads. Everything else goes straight to the network, as if there were no worker.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Klivr', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Klivr';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/dashboard' },
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
