/* App do painel: guarda só os arquivos visuais (nunca as páginas do painel, que têm dados da conta)
   e mostra um aviso quando o celular está sem internet. */
const CACHE = 'painel-v1';
const ARQUIVOS = ['/admin.css', '/editor.js', '/app.js', '/logo-escuro.svg', '/logo-claro.svg', '/app-icone-192.png', '/offline-admin.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('/offline-admin.html'))); return; }
  const url = new URL(req.url);
  if (url.origin !== location.origin || !ARQUIVOS.includes(url.pathname)) return;
  /* rede primeiro, para as atualizações chegarem na hora; o cache só cobre a falta de conexão */
  e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copia)); return r; })
    .catch(() => caches.match(url.pathname)));
});
