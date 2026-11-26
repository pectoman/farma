'use strict';

// Cambiar esta versión cuando se publique una nueva versión de la aplicación.
const CACHE_NAME = 'control-ausencias-v12-20261126';
const APP_CACHE_PREFIX = 'control-ausencias-';

const scopedUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Precargar solo los recursos esenciales. No fallar si el manifiesto
    // o los iconos no están publicados todavía.
    await cache.addAll([scopedUrl('./'), scopedUrl('index.html')]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // No interceptar recursos externos ni peticiones de otras webs.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Red primero: al publicar el index nuevo, se obtiene la versión nueva.
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match(scopedUrl('index.html'));
        if (fallback) return fallback;
      }
      return new Response('Sin conexión y sin copia local disponible.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
