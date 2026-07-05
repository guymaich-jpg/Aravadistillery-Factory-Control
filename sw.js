// ============================================================
// Service Worker — Factory Control PWA
// ============================================================

const APP_VERSION = '2.9.2';
const CACHE_NAME = 'factory-v' + APP_VERSION;

// App shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/init-theme.js',
  '/auth.js',
  '/data.js',
  '/script.js',
  '/firebase.js',
  '/firestore-sync.js',
  '/i18n.js',
  '/api-client.js',
  '/sheets-sync.js',
  '/storage.js',
  '/helpers.js',
  '/module-fields.js',
  '/backoffice.js',
  '/vendor/feather.min.js',
];

// API domains — use network-first strategy
const API_DOMAINS = [
  'script.google.com',
  'script.googleusercontent.com',
  'firebaseio.com',
  'googleapis.com',
  'aravadistillery-factory-control.vercel.app',
];

// ============================================================
// INSTALL — Pre-cache app shell
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('factory-'))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Network-first for app files, cache-first for CDN assets
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Same-origin (app shell + API): always network-first so code updates
  // take effect immediately. Cache is fallback for offline only.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cross-origin API: network-first
  const isAPI = API_DOMAINS.some((domain) => url.hostname.endsWith(domain));
  if (isAPI) {
    event.respondWith(networkFirst(event.request));
  } else {
    // Cross-origin static assets (fonts, CDN scripts): cache-first for speed
    event.respondWith(cacheFirst(event.request));
  }
});

// ============================================================
// STRATEGIES
// ============================================================

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  }).catch(() => {
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  }).catch(() => {
    return caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    });
  });
}
