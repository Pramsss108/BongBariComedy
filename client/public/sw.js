/**
 * Bong Bari Service Worker (minimal, offline-safe shell for /ngl/*).
 * No aggressive caching of the SPA shell — GitHub Pages handles fresh HTML.
 * We only stash:
 *   - the webmanifest
 *   - small static icons
 *   - last-good /ngl API *version* marker (to detect server down)
 *
 * Do NOT cache HTML or JS bundles — it breaks "FORCE_PAGES_DEPLOY" cache-busting.
 */
const SW_VERSION = 'bong-sw-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;

const STATIC_ASSETS = [
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-192x192.png',
  '/apple-touch-icon.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('bong-sw-') && !k.startsWith(SW_VERSION)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin static assets we pre-cached
  if (url.origin !== location.origin) return;
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached || Response.error());
    })
  );
});

// Hook for future C2 Web Push — harmless no-op until PRO push is wired.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Bong NGL';
    const options = {
      body: data.body || 'You have a new anonymous message',
      icon: '/favicon-192x192.png',
      badge: '/favicon-32x32.png',
      data: { url: data.url || '/ngl/dashboard' },
      tag: 'bong-ngl',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/ngl/dashboard';
  event.waitUntil(self.clients.openWindow(url));
});
