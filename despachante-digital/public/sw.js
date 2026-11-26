// Cache leve: o site abre mesmo com dados lentos. Páginas: rede primeiro; ficheiros estáticos: cache primeiro.
const V = 'dd-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const estatico = u.pathname.startsWith('/_next/static/') || u.pathname === '/pdf.worker.min.js' || u.pathname === '/icon.svg';
  if (estatico) { e.respondWith(caches.open(V).then(async c => (await c.match(r)) || fetch(r).then(x => { if (x.ok) c.put(r, x.clone()); return x; }))); return; }
  if (r.mode === 'navigate') e.respondWith(fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); return x; }).catch(() => caches.match(r).then(m => m || caches.match('/'))));
});
