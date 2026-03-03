// Eagles ERP — Custom Service Worker: Push Notifications
// Este archivo se fusiona con el SW generado por @ducanh2912/next-pwa (Workbox)

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Eagles ERP', body: event.data?.text() ?? '' };
  }

  const title = data.title ?? 'Eagles ERP';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/eagles-logo-square.png',
    badge: '/eagles-logo-square.png',
    data: { url: data.url ?? '/dashboard' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(url) && 'focus' in c);
        if (existing) return (existing as WindowClient).focus();
        return self.clients.openWindow(url);
      })
  );
});
