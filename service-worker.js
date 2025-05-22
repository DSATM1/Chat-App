// Cache names
const CACHE_NAME = 'chat-app-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
  );
});

// Activate service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch strategy: network first, then cache
self.addEventListener('fetch', event => {
  // Skip for socket.io requests
  if (event.request.url.includes('/socket.io/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  
  // Open/focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If a tab is already open, focus it
      for (const client of clientList) {
        if (client.url === notificationData.url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(notificationData.url);
      }
    })
  );
}); 