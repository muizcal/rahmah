// ── Makeup by Rahmah — Service Worker ────────────────────────────────────────
// This file runs in the background even when the app is closed.
// When the server sends a push notification, this wakes up and shows it.
// When the user taps the notification, this opens the app with alarm data.

const CACHE_NAME = 'rahmah-v1';

// ── Install & cache core files ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html', '/manifest.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ── Serve from cache when offline ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only cache GET requests for app shell — not API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Push notification received (app can be CLOSED) ────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try { data = JSON.parse(event.data.text()); }
  catch { return; }

  // Store the alarm data so the app can read it when it opens
  // We use IndexedDB via a simple helper
  const storeAlarm = async () => {
    const db = await openAlarmDB();
    await dbPut(db, 'pending_alarm', data);
  };

  // Show the OS notification (this is what wakes the screen)
  const showNotif = self.registration.showNotification(data.title || '💄 Makeup by Rahmah', {
    body:    data.body,
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-96.png',
    tag:     'rahmah-alarm-' + data.appointmentId,
    renotify: true,
    requireInteraction: true,   // stays on screen until tapped
    vibrate: [300, 100, 300, 100, 300],
    data:    data                // pass full data to notificationclick
  });

  event.waitUntil(Promise.all([storeAlarm(), showNotif]));
});

// ── User taps the notification ─────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app is already open, focus it and send alarm data
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'TRIGGER_ALARM', data });
          return;
        }
      }
      // App is closed — open it. The app will read pending_alarm from IndexedDB on load
      return self.clients.openWindow('/?alarm=' + data.appointmentId);
    })
  );
});

// ── IndexedDB helpers (lightweight — no library needed) ───────────────────────
function openAlarmDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rahmah_sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('store');
    req.onsuccess  = e => resolve(e.target.result);
    req.onerror    = e => reject(e.target.error);
  });
}

function dbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('store', 'readwrite');
    const req = tx.objectStore('store').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}
