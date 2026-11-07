const CACHE_NAME = 'debate-tracker-v1';

// This is the list of files the tablet will download and store offline.
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    'https://unpkg.com/html5-qrcode' // The camera scanner library
];

// 1. Install Event: Cache all the files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

// 2. Fetch Event: Intercept network requests and serve from cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // If the file is in the cache, return it. Otherwise, try the network.
            return response || fetch(event.request);
        })
    );
});