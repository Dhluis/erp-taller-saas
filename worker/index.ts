// Eagles ERP — Custom Service Worker: Push Notifications
// Este archivo se fusiona con el SW generado por @ducanh2912/next-pwa (Workbox)

// @ts-ignore
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('push', (event) => {
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

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/dashboard';
  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(url) && 'focus' in c);
        if (existing) return (existing as any).focus();
        return sw.clients.openWindow(url);
      })
  );
});
