/* =========================================================================
   Connect ONG - Service Worker (PWA)
   Cacheia a "casca" do app (HTML/CSS/JS/assets do MESMO domínio) para abrir
   offline e instalar. NÃO intercepta a API (outra origem, :8080) nem os CDNs —
   deixa passar direto. Não intercepta POST/PUT (login, doações, mensagens).
   ========================================================================= */
const CACHE = 'connectong-v1';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/api.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './assets/img/logo.jpg',
  './assets/img/dora_mascote.svg',
  './assets/dados/municipios_por_uf.json',
  './assets/dados/cidades_coords.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))) // não falha o install se 1 asset faltar
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // login/API POST passam direto
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // API (:8080) e CDNs passam direto

  // Navegação: rede primeiro, cai no index cacheado offline (SPA).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Assets do próprio app: cache primeiro (rápido/offline), atualiza em 2º plano.
  e.respondWith(
    caches.match(req).then((cached) => {
      const rede = fetch(req).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
      return cached || rede;
    })
  );
});
