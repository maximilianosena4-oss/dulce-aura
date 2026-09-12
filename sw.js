// Service Worker — Dulce Aura (Fase C5.2)
//
// Reglas de caché por tipo de recurso (no negociables, ver instrucción de
// la fase): la velocidad nunca puede ganarle a la frescura del stock/precio.
//
// - CACHE_STATIC (cache-first): CSS, fuentes, íconos, imágenes de marca
//   (hero, emblema, branding). No cambian entre visitas, priorizan velocidad.
// - Fuente de verdad — data/productos.json, data/destacados.json,
//   data/novedades.json (network-first): SIEMPRE se intenta la red primero.
//   Si la red responde, esa respuesta se usa y además actualiza el cache.
//   El cache de estos 3 archivos es solo el último recurso si no hay
//   conexión — nunca la primera opción. Así un producto que se agotó o
//   cambió de precio nunca se muestra viejo por culpa del Service Worker.
// - Fotos de producto (assets/productos/): stale-while-revalidate — se
//   sirve lo cacheado al instante para que la clienta no espere, pero en
//   paralelo se pide la versión real a la red y se actualiza el cache; si
//   el proveedor reemplazó una foto, la próxima visita ya la tiene.
// - Todo lo demás (stream de radio externo, WhatsApp, dominios de fuentes,
//   HTML de navegación) pasa directo a la red sin intervención del SW.

const CACHE_VERSION = 'v1';
const CACHE_STATIC = `dulce-aura-static-${CACHE_VERSION}`;
const CACHE_DATA = `dulce-aura-data-${CACHE_VERSION}`;
const CACHE_PRODUCTOS_IMG = `dulce-aura-productos-img-${CACHE_VERSION}`;
const CACHES_VIGENTES = [CACHE_STATIC, CACHE_DATA, CACHE_PRODUCTOS_IMG];

const DATOS_FUENTE_DE_VERDAD = [
  '/data/productos.json',
  '/data/destacados.json',
  '/data/novedades.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(nombre => nombre.startsWith('dulce-aura-') && !CACHES_VIGENTES.includes(nombre))
          .map(nombre => caches.delete(nombre))
      )
    ).then(() => self.clients.claim())
  );
});

function esRecursoEstatico(url) {
  return (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/assets/branding/') ||
    url.pathname.startsWith('/assets/hero/') ||
    url.pathname === '/manifest.json'
  );
}

function esDatoFuenteDeVerdad(url) {
  return DATOS_FUENTE_DE_VERDAD.includes(url.pathname);
}

function esFotoProducto(url) {
  return url.pathname.startsWith('/assets/productos/') || url.pathname.startsWith('/assets/novedades/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cacheada = await cache.match(request);
  if (cacheada) return cacheada;
  const red = await fetch(request);
  if (red.ok) cache.put(request, red.clone());
  return red;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const red = await fetch(request, { cache: 'no-store' });
    if (red.ok) cache.put(request, red.clone());
    return red;
  } catch (err) {
    const cacheada = await cache.match(request);
    if (cacheada) return cacheada;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cacheada = await cache.match(request);
  const redPromesa = fetch(request).then(red => {
    if (red.ok) cache.put(request, red.clone());
    return red;
  }).catch(() => null);
  return cacheada || (await redPromesa) || Response.error();
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // radio externa, fonts de Google, etc: directo a la red

  if (esDatoFuenteDeVerdad(url)) {
    event.respondWith(networkFirst(request, CACHE_DATA));
  } else if (esFotoProducto(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_PRODUCTOS_IMG));
  } else if (esRecursoEstatico(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
  }
  // el resto (index.html, navegación) no se intercepta: siempre red
});
