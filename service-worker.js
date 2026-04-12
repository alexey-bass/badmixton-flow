// Service Worker — offline-first caching for Badmixton Flow
// Cache version is bumped by the pre-commit hook via CACHE_VERSION below.
var CACHE_VERSION = 92;
var CACHE_NAME = 'badmixton-v' + CACHE_VERSION;

var APP_SHELL = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/js/i18n.js',
  './assets/js/app.js',
  './assets/img/favicon-16.png',
  './assets/img/favicon-96.png',
  './assets/img/favicon-192.png',
  './assets/img/favicon-512.png',
  './manifest.json'
];

// Install — cache app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key.startsWith('badmixton-') && key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for app shell, network-first for external
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-only for external resources (Firebase, Analytics, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // Return cached version, but also fetch fresh copy in background
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Network failed — cached version will be used
      });

      return cached || fetchPromise;
    })
  );
});
