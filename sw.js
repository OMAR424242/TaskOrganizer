/*
 * One Thing — service worker.
 *
 * Two jobs: make the app open with no connection, and never serve a stale
 * version silently. Bump CACHE whenever you change a file listed in SHELL.
 *
 * Your tasks are NOT in here. They live in localStorage on the device, which
 * this file never touches — clearing the cache cannot lose your data.
 */
const CACHE = 'one-thing-v10';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './sync.js',
  './app.js',
  './fonts/nunito-variable.woff2',
  './manifest.webmanifest',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll fails the whole install if any one file 404s, which would leave
      // no cache at all; this way a missing icon costs only that icon.
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations: try the network so a deploy is picked up, fall back to the
  // cached page when there is no connection.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // The sync service and the auth endpoints must never be cached — a stale
  // token response is worse than no response. Let them go straight past.
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return;

  // Everything else: cache first, since the shell is versioned by the CACHE
  // name above rather than by per-file revalidation.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
