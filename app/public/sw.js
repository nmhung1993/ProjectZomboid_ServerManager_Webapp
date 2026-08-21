// Simple PWA Service Worker for caching and installability
const CACHE_NAME = 'zomboid-manager-v1';

const STATIC_ASSETS = [
    '/manifest.webmanifest',
    '/apple-touch-icon.png',
    '/favicon.ico',
    '/favicon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Ignore individual caching errors during install
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests and non-API/non-Inertia requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Bypass caching for dynamic web routes, POST actions, storage, and API
    if (url.origin !== self.location.origin) {
        return;
    }

    // Network-first for html/pages, cache-first for static icons/manifest
    if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/storage/site/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
});
