/* Service worker: permite abrir la app sin internet.
   Al publicar cambios en index.html, sube el número de versión para forzar la actualización. */
const VERSION = 'vida-tiempos-v8';
const SHELL_CACHE = 'vida-shell';            // copia de la página principal (la app también la guarda desde la página)
const SHELL = new URL('./', self.location).href;
const ASSETS = ['./manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

/* Netlify puede redirigir /index.html → /. Chrome no acepta servir una respuesta
   "redirigida" a una navegación (muestra el dinosaurio), así que se guarda una copia limpia. */
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
async function put(cacheName, url, key) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (res && res.ok) { await (await caches.open(cacheName)).put(key || url, await clean(res)); return true; }
  } catch (e) {}
  return false;
}

self.addEventListener('install', (e) => {
  // Nunca falla la instalación: si algo no se pudo guardar, la página lo guarda después.
  e.waitUntil((async () => {
    (await put(SHELL_CACHE, './', SHELL)) || (await put(SHELL_CACHE, './index.html', SHELL));
    await Promise.all(ASSETS.map((a) => put(VERSION, a)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Apps Script: siempre por red (los datos nunca se sirven de caché).
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  // Fuentes de Google: caché primero.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Abrir la app: red primero (máx. 4 s si ya hay copia); sin red, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const net = fetch(req).then(async (res) => {
        if (res && res.ok) await (await caches.open(SHELL_CACHE)).put(SHELL, await clean(res.clone()));
        return clean(res);
      });
      const timer = new Promise((res) => setTimeout(() => res(null), 4000));
      try {
        const first = await Promise.race([net, timer]);
        if (first && first.ok) return first;
      } catch (err) {}
      const saved = await caches.match(SHELL);
      if (saved) return saved;
      try { return await net; } catch (err) { return Response.error(); }
    })());
    return;
  }

  // Íconos y demás archivos: caché primero y se actualizan en segundo plano.
  e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then(async (res) => { if (res.ok) await c.put(req, await clean(res.clone())); return res; }).catch(() => hit);
    return hit || net;
  })));
});
