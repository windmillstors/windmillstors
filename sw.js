/* Windmill Orders — service worker
   Makes the dashboard installable and lets it open without signal.
   Order data itself always comes live from Firebase (never cached here). */
const CACHE = 'windmill-orders-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch Firebase database traffic
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit/.test(url.host + url.pathname)) return;
  const cacheable = url.origin === self.location.origin ||
    /(^|\.)gstatic\.com$|fonts\.googleapis\.com$|fonts\.gstatic\.com$/.test(url.host);
  if (!cacheable) return;
  // Network first (so updates show straight away), cache as fallback when offline
  e.respondWith(fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
