
const CACHE_NAME = 'mst-app-v4';
const DYNAMIC_CACHE_NAME = 'mst-dynamic-v4';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
];

// Install Event: Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching Shell Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Navigation Requests (HTML) - Network First, then Cache, then Fallback to index.html (SPA support)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not in cache and network failed, return index.html (SPA offline support)
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // 2. Static Assets (Scripts, Styles, Images) - Stale-While-Revalidate
  // Serve from cache immediately, then update cache from network in background
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
             caches.open(DYNAMIC_CACHE_NAME).then(cache => {
               cache.put(request, networkResponse.clone());
             });
          }
          return networkResponse;
        }).catch(err => {
           // Network failed, do nothing, we already have cache or will return undefined
        });
        
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API Calls (Pollinations, Google AI) - Network Only (don't cache AI responses aggressively)
  if (url.hostname.includes('pollinations.ai') || url.hostname.includes('googleapis.com') || url.hostname.includes('google.genai')) {
      event.respondWith(fetch(request));
      return;
  }

  // 4. Default Strategy: Cache First, Fallback to Network
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(networkResponse => {
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              // Only cache valid http/https responses
              if(url.protocol.startsWith('http')) {
                  cache.put(request, networkResponse.clone());
              }
              return networkResponse;
          });
      });
    })
  );
});