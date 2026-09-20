/**
 * Service Worker de Noni.
 *
 * Estrategia:
 *   · Navegaciones (HTML): red primero, con el index cacheado como respaldo
 *     offline. Así una versión nueva se ve al instante y la app sigue abriendo
 *     sin señal.
 *   · Assets con hash (/assets/*): cache primero. El nombre cambia en cada
 *     build, así que nunca se sirve una versión vieja por error.
 *   · Supabase, Cloudinary y cualquier otro origen: siempre a la red. Los datos
 *     del negocio jamás se guardan en la caché del navegador.
 */

const CACHE_NAME = 'noni-cache-v3';
const OFFLINE_URL = '/index.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // `addAll` falla entero si un solo archivo 404ea; los agregamos de a uno.
      .then((cache) => Promise.allSettled(ASSETS_TO_CACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Sólo nuestro propio origen. Supabase, Cloudinary, Google Fonts y el
  // generador de QR van directo a la red, sin pasar por la caché.
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, index offline como respaldo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_NAME).then((c) => c.put(OFFLINE_URL, copia)).catch(() => {});
          return respuesta;
        })
        .catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  // Assets versionados: cache primero (su nombre cambia en cada despliegue).
  const esAssetConHash = url.pathname.startsWith('/assets/');

  event.respondWith(
    caches.match(request).then((cacheado) => {
      if (cacheado && esAssetConHash) return cacheado;

      return fetch(request)
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copia)).catch(() => {});
          }
          return respuesta;
        })
        .catch(() => cacheado || Response.error());
    })
  );
});
