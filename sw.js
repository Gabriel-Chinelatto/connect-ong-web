/* =========================================================================
   Connect ONG - Service Worker (PWA)
   Cacheia a "casca" do app (HTML/CSS/JS/assets do MESMO domínio) para abrir
   offline e instalar. NÃO intercepta a API (outra origem, :8080) nem os CDNs —
   deixa passar direto. Não intercepta POST/PUT (login, doações, mensagens).
   ========================================================================= */
const CACHE = 'connectong-v3';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/api.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './assets/img/logo.jpg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/icon-maskable-512.png',
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

// Só os ARQUIVOS do app são cacheáveis. O resto do mesmo domínio é a API
// (o Netlify faz proxy same-origin: /ongs, /publico/*, /necessidades... vão pro
// backend) e NUNCA pode ser cacheado — senão a listagem/estatísticas ficariam
// congeladas mostrando dados velhos.
function ehEstatico(url) {
  const p = url.pathname;
  return p === '/' || p === '/index.html' || p === '/manifest.json' || p === '/sw.js' ||
    p.startsWith('/css/') || p.startsWith('/js/') || p.startsWith('/assets/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // login/POST/PUT/DELETE passam direto
  const url = new URL(req.url);

  // Navegação (SPA): rede primeiro; offline cai no index cacheado.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // CDNs (outra origem) e API (mesma origem, mas NÃO é arquivo do app) passam
  // DIRETO, sem cache. Este é o ponto crítico: sem isto o SW serviria respostas
  // ANTIGAS da API (cache-first) e o app mostraria dados desatualizados.
  if (url.origin !== self.location.origin || !ehEstatico(url)) return;

  // Apenas os assets do app: cache primeiro (rápido/offline), atualiza em 2º plano.
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
