// Service Worker — Eagles ERP Push Notifications

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { title: 'Eagles ERP', body: event.data?.text() || '' }
  }

  const title = data.title || 'Eagles ERP'
  const options = {
    body: data.body || '',
    icon: '/eagles-logo-square.png',
    badge: '/eagles-logo-square.png',
    data: { url: data.url || '/dashboard' },
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
