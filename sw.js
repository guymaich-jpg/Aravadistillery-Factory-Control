// ============================================================
// Service Worker — Factory Control PWA
// ============================================================

const CACHE_NAME = 'factory-v1.14.0';

// App shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/auth.js',
  '/data.js',
  '/script.js',
  '/firebase.js',
  '/firestore-sync.js',
  '/i18n.js',
  '/api-client.js',
  '/sync.js',
  '/sheets-sync.js',
  '/storage.js',
  '/helpers.js',
  '/module-fields.js',
  '/backoffice.js',
  '/google-apps-script.js'
];

// API domains — use network-first strategy
const API_DOMAINS = [
  'script.google.com',
  'firebaseio.com',
  'googleapis.com',
  'vercel'
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
// FETCH — Cache-first for static, network-first for API
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Check if this is an API request
  const isAPI = API_DOMAINS.some((domain) => url.hostname.includes(domain) || url.pathname.includes(domain));

  if (isAPI) {
    // Network-first for API calls
    event.respondWith(networkFirst(event.request));
  } else {
    // Cache-first for static assets
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
      // Cache successful responses for same-origin static assets
      if (response.ok && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  }).catch(() => {
    // If both cache and network fail, return offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    // Cache successful API responses for offline use
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  }).catch(() => {
    // Network failed — try cache
    return caches.match(request).then((cached) => {
      if (cached) return cached;
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });
}
