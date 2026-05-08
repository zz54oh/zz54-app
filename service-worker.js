const CACHE_NAME = 'chuanxun-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/home.css',
  './js/app.js',
  './js/config.js',
  './js/core.js',
  './js/data.js',
  './js/features.js',
  './js/games.js',
  './js/listeners.js',
  './js/onboarding.js',
  './js/state.js',
  './js/utils.js',
  './js/home.js',
  './js/features/call.js',
  './js/features/envelope.js',
  './js/features/group-chat.js',
  './js/features/mood.js',
  './js/features/reply-library.js',
  './js/features/theme-editor.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 跨域资源（CDN字体、图标库）：网络优先，失败则缓存
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 本地资源：缓存优先，后台更新
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
