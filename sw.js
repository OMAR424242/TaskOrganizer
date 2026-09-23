/*
 * One Thing — service worker.
 *
 * Two jobs: make the app open with no connection, and never serve a stale
 * version silently. Bump CACHE whenever you change a file listed in SHELL.
 *
 * Your tasks are NOT in here. They live in localStorage on the device, which
 * this file never touches — clearing the cache cannot lose your data.
 */
const CACHE = 'one-thing-v23';

const SHELL = [
  './',
  './index.html',
  './privacy.html',
  './delete-account.html',
  './styles.css',
  './config.js',
  './native.js',
  './sync.js',
  './app.js',
  './vendor/supabase.js',
  './fonts/nunito-variable.woff2',
  './fonts/OpenDyslexic-Regular.woff2',
  './fonts/OpenDyslexic-Bold.woff2',
  './fonts/AtkinsonHyperlegible-Regular.woff2',
  './fonts/AtkinsonHyperlegible-Bold.woff2',
  './art/char-m-idle.webp',
  './art/char-m-wash.webp',
  './art/char-m-sleep.webp',
  './art/char-m-clean.webp',
  './art/char-m-laundry.webp',
  './art/char-m-plants.webp',
  './art/char-m-game.webp',
  './art/char-m-music.webp',
  './art/char-f-wash.webp',
  './art/char-f-sleep.webp',
  './art/char-f-clean.webp',
  './art/char-f-laundry.webp',
  './art/char-f-plants.webp',
  './art/char-f-game.webp',
  './art/char-f-music.webp',
  './art/char-m-cook.webp',
  './art/char-m-move.webp',
  './art/char-m-eat.webp',
  './art/char-m-study.webp',
  './art/char-m-work.webp',
  './art/char-m-cheer.webp',
  './art/char-f-idle.webp',
  './art/char-f-cook.webp',
  './art/char-f-move.webp',
  './art/char-f-eat.webp',
  './art/char-f-study.webp',
  './art/char-f-work.webp',
  './art/char-f-cheer.webp',
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
      //
      // `cache: 'reload'` is the important part and its absence was a real
      // bug. cache.add() does an ordinary fetch, and an ordinary fetch reads
      // the browser's own HTTP cache first. GitHub Pages serves everything
      // with max-age=600, so for ten minutes after a deploy this worker
      // would faithfully copy the *previous* app.js into the *new* cache
      // under the *new* version name — and then serve it forever, because
      // the cache is versioned and never revalidated.
      //
      // What that looks like from the outside is the worst possible thing:
      // the page itself updates, because navigations go to the network
      // below, so you get the new index.html running the old JavaScript.
      // Some of the new features are there and some are not, the version
      // number was clearly bumped, and nothing looks broken enough to
      // explain it. Bypassing the HTTP cache here is the whole fix.
      .then((c) => Promise.allSettled(
        SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })))))
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
