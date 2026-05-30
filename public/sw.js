// Service Worker for Family Planner PWA - Optimized for VPS
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `family-planner-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Strategia cache: rozdzielamy różne typy zasobów
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Installation failed:', err);
      })
  );

  // Aktywuj nowy SW natychmiast
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Usuń wszystkie stare cache oprócz aktualnych
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Przejmij kontrolę nad wszystkimi klientami
      return self.clients.claim();
    })
  );
});

// Strategie cachowania
const strategies = {
  // Network First - dla API i dynamicznych danych
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  },

  // Cache First - dla statycznych zasobów
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  },

  // Stale While Revalidate - dla obrazów
  staleWhileRevalidate: async (request) => {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(IMAGE_CACHE);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    });

    return cachedResponse || fetchPromise;
  },
};

// Fetch event - wybierz strategię w zależności od typu żądania
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Routing do odpowiedniej strategii
  if (url.pathname.startsWith('/api/')) {
    // API - Network First
    event.respondWith(
      strategies.networkFirst(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    // Obrazy - Stale While Revalidate
    event.respondWith(
      strategies.staleWhileRevalidate(request).catch(() => {
        return new Response('Image not available offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Next.js static files - Cache First (immutable)
    event.respondWith(strategies.cacheFirst(request));
  } else {
    // Strony HTML - Network First z offline fallback
    event.respondWith(
      strategies.networkFirst(request).catch(async () => {
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
        }

        return new Response('Offline - content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // TODO: Implement data synchronization logic
  console.log('[SW] Syncing data...');
}

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('[SW] Invalid push payload:', error);
  }

  const title = data.title || 'Family Planner';
  const body = data.body || data.message || 'Masz nowe powiadomienie';
  const url = data.url || data.data?.url || '/';

  const options = {
    body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'planner-notification',
    data: {
      url,
      notificationId: data.notificationId || data.data?.notificationId,
      taskId: data.taskId || data.data?.taskId,
      ...(data.data || {}),
    },
    actions: data.actions || [],
    requireInteraction: Boolean(data.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(absoluteUrl);
            }
            return undefined;
          });
        }
      }
      return clients.openWindow(absoluteUrl);
    })
  );
});

