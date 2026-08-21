const CACHE_VERSION = 'gdg-go-v4';
const APP_CACHE = `${CACHE_VERSION}-app`;
const GAME_CACHE = `${CACHE_VERSION}-game`;
const APP_SHELL = ['/', '/manifest.webmanifest', '/assets/favicon.png', '/assets/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await Promise.allSettled(APP_SHELL.map(async (path) => {
      const response = await fetch(path, { cache: 'reload' });
      if (response.ok) await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('gdg-go-') && name !== APP_CACHE && name !== GAME_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function cacheKeyFor(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const key = cacheKeyFor(request);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(key, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(key)) || (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cacheName = new URL(request.url).pathname.startsWith('/Build/') ? GAME_CACHE : APP_CACHE;
  const cache = await caches.open(cacheName);
  const key = cacheKeyFor(request);
  const cached = await cache.match(key);
  const update = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(key, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const cacheablePath = url.pathname.startsWith('/Build/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/branding/') ||
    url.pathname.startsWith('/models/') ||
    ['script', 'style', 'font', 'image'].includes(request.destination);

  if (cacheablePath) event.respondWith(staleWhileRevalidate(request));
});
