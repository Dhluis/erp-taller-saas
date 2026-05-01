# PWA + Push Notifications — Confia Drive ERP

**Última actualización:** Abril 2026

---

## Arquitectura

El proyecto usa un **service worker propio** (sin `@ducanh2912/next-pwa` ni Workbox). Esto da control total sobre el comportamiento de push notifications.

| Archivo | Rol |
|---|---|
| `public/sw.js` | Service worker personalizado — maneja `push` y `notificationclick` |
| `src/app/manifest.ts` | Manifest PWA nativo de Next.js 15 (App Router) |
| `src/components/ServiceWorkerRegister.tsx` | Registra `/sw.js` en el cliente |
| `src/app/api/push/subscribe/route.ts` | POST/DELETE — guarda/borra suscripciones en BD |
| `src/app/api/push/send/route.ts` | POST — envía push a todos los suscriptores de la org |
| `src/components/PushNotificationButton.tsx` | UI para solicitar permiso y suscribirse |

---

## Tabla `push_subscriptions`

```sql
id, organization_id, endpoint, p256dh, auth, created_at
```

RLS: usuario solo ve sus propias suscripciones. El endpoint de envío usa `SUPABASE_SERVICE_ROLE_KEY`.

---

## Flujo de suscripción

1. Usuario hace clic en `PushNotificationButton`
2. El browser pide permiso → `Notification.requestPermission()`
3. Se obtiene `PushSubscription` via `serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`
4. Se hace POST a `/api/push/subscribe` con el objeto subscription
5. El servidor guarda `endpoint`, `p256dh`, `auth` en `push_subscriptions`

## Flujo de envío

1. Backend llama `POST /api/push/send` con `{ title, body, url }`
2. La ruta obtiene todas las suscripciones de la organización
3. Llama `webpush.sendNotification()` para cada una con `VAPID_PRIVATE_KEY`
4. El SW recibe el evento `push` y muestra la notificación

## Comportamiento del SW

```js
// public/sw.js
self.addEventListener('push', event => {
  const { title, body, url } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, { body, data: { url } })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

---

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # Expuesta al cliente
VAPID_PRIVATE_KEY=...              # Solo servidor
VAPID_EMAIL=mailto:admin@dominio.com
```

Generar: `npx web-push generate-vapid-keys`

---

## Instalación como App

- En móvil (Android/iOS): "Añadir a pantalla de inicio" desde el menú del browser
- En desktop (Chrome/Edge): botón de instalación en la barra de dirección
- Modo `standalone` configurado en el manifest

---

## Desarrollo

El SW se registra incluso en desarrollo. Para evitar conflictos con hot reload, limpiar el SW registrado desde DevTools → Application → Service Workers → Unregister si hay problemas de caché.
