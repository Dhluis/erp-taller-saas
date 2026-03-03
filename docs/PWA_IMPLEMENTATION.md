# Implementación PWA - Eagles ERP

**Fecha:** Febrero 2025

## Resumen

La aplicación Eagles ERP está configurada como **Progressive Web App (PWA)** usando `@ducanh2912/next-pwa` (Workbox), con **custom worker** para preservar las **push notifications**.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `next.config.js` | Envuelto con `withPWA()`, `customWorkerSrc: "worker"` para fusionar código custom con Workbox |
| `worker/index.ts` | Custom worker con handlers de `push` y `notificationclick` — se compila e importa en el SW principal |
| `public/manifest.json` | Manifest con nombre, iconos, theme_color, display standalone |
| `src/app/layout.tsx` | `manifest`, `appleWebApp`, `viewport.themeColor` en metadata |
| `src/components/ServiceWorkerRegister.tsx` | Registra `/sw.js` en el cliente |

## Archivos generados en build

| Archivo | Descripción |
|---------|-------------|
| `public/sw.js` | Service worker principal generado por Workbox (precache + import del custom worker) |
| `public/workbox-*.js` | Runtime de Workbox |
| `public/worker-*.js` | Código de push notifications compilado, importado por `sw.js` |

## Comportamiento

- **Desarrollo:** PWA deshabilitada (`disable: process.env.NODE_ENV === "development"`) para evitar conflictos con hot reload.
- **Producción:** El build genera `sw.js`, `workbox-*.js` y `worker-*.js`. `ServiceWorkerRegister` registra `/sw.js`.
- **Instalación:** En móvil/desktop el usuario puede "Añadir a la pantalla de inicio" o "Instalar app".
- **Precache:** Workbox cachea automáticamente JS, CSS e imágenes estáticas de Next.js.
- **Push notifications:** Los handlers en `worker/index.ts` se fusionan con el SW; las notificaciones push funcionan si el backend envía payloads con `{ title, body, url }`.

## Solución: custom worker para push

`@ducanh2912/next-pwa` genera su propio `sw.js` y sobrescribe cualquier SW manual. Para conservar push notifications:

1. **`customWorkerSrc: "worker"`** en la config de next-pwa — indica la carpeta del worker custom.
2. **`worker/index.ts`** — contiene solo los listeners de `push` y `notificationclick`. Next-pwa usa InjectManifest y fusiona este código con el precache de Workbox.

No hace falta importar Workbox manualmente; next-pwa inyecta el precache y el runtime.

## Iconos

El manifest usa `eagles-logo-square.png` para los iconos PWA (192x192 y 512x512). Si el logo tiene otras dimensiones, el navegador los escala.

## Verificación

1. `npm run build` — debe generar `public/sw.js`, `public/workbox-*.js` y `public/worker-*.js`.
2. Chrome DevTools → Application → Manifest: verificar que el manifest se carga.
3. Application → Service Workers: verificar que el SW está registrado.
4. Para probar push: suscribir al usuario con `PushManager` y enviar una notificación desde el backend (web-push, VAPID).
