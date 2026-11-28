/* Service Worker extension for Lentera Madrasah external notifications & app icon badging */

self.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : null;
  if (!data) return;

  if (data.type === 'SYNC_BADGE') {
    const count = Math.max(0, Math.floor(Number(data.count) || 0));
    if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
      if (count > 0) {
        event.waitUntil(self.navigator.setAppBadge(count).catch(() => {}));
      } else if (typeof self.navigator.clearAppBadge === 'function') {
        event.waitUntil(self.navigator.clearAppBadge().catch(() => {}));
      }
    }
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'Lentera Madrasah',
    body: 'Ada pemberitahuan baru dari madrasah.',
    badgeCount: 1,
    url: '/?tab=notifikasi',
    tag: 'lentera-push-' + Date.now(),
  };

  try {
    const parsed = event.data.json();
    payload = {
      title: parsed.title || payload.title,
      body: parsed.body || parsed.message || payload.body,
      badgeCount:
        typeof parsed.badgeCount === 'number' ? parsed.badgeCount : payload.badgeCount,
      url: parsed.url || payload.url,
      tag: parsed.tag || payload.tag,
    };
  } catch {
    const text = event.data.text();
    if (text) payload.body = text;
  }

  const tasks = [
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag,
      data: { url: payload.url },
    }),
  ];

  if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
    const count = Math.max(1, Math.floor(Number(payload.badgeCount) || 1));
    tasks.push(self.navigator.setAppBadge(count).catch(() => {}));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) ||
    '/?tab=notifikasi';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'OPEN_NOTIFICATIONS' });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
