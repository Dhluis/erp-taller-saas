# 🔧 Fix: Problema de Doble Login con OAuth

## 📋 Problema Reportado

Después de hacer login con Google OAuth:
1. Aparece una pantalla de login inicial
2. Después de iniciar sesión con Google, aparece otra pantalla más pequeña con login nuevamente
3. Solo en la segunda pantalla puede acceder al dashboard

## 🔍 Análisis del Problema

### Causa Raíz: Condición de Carrera (Race Condition)

El flujo actual es:
1. Usuario hace login con Google OAuth
2. Callback `/auth/callback` procesa el código y establece cookies de sesión en el servidor
3. Redirige al `/dashboard`
4. `DashboardLayout` se monta y verifica sesión con `useSession()`
5. `SessionContext` intenta cargar la sesión, pero las cookies aún no están disponibles en el cliente
6. `DashboardLayout` detecta que no hay usuario y redirige al login
7. Cuando el usuario llega al login, las cookies ya están disponibles, así que puede acceder

**Problema:** Hay un delay entre cuando las cookies se establecen en el servidor (callback) y cuando están disponibles en el cliente (SessionContext).

## ✅ Soluciones Recomendadas

### Opción 1: Agregar delay en DashboardLayout después de callback (Recomendada)

Modificar `src/app/(dashboard)/layout.tsx` para detectar si viene de un callback de OAuth y esperar un poco más antes de verificar la sesión:

```typescript
// En DashboardLayout, agregar verificación de URL de callback
useEffect(() => {
  // Si venimos de un callback de OAuth, esperar un poco más
  const isFromCallback = document.referrer.includes('/auth/callback') || 
                         sessionStorage.getItem('oauth_callback') === 'true'
  
  if (isFromCallback) {
    sessionStorage.removeItem('oauth_callback')
    // Esperar 500ms adicionales para que las cookies se sincronicen
    const timeout = setTimeout(() => {
      // Forzar recarga de sesión
      if (session?.refresh) {
        session.refresh()
      }
    }, 500)
    return () => clearTimeout(timeout)
  }
}, [])
```

### Opción 2: Mejorar el callback para establecer flag

Modificar `src/app/auth/callback/route.ts` para establecer un flag en sessionStorage antes de redirigir:

```typescript
// Antes de redirigir en el callback
const redirectResponse = createRedirectResponse(next, response)
// Agregar header o cookie para indicar que viene de callback
redirectResponse.headers.set('X-OAuth-Callback', 'true')
return redirectResponse
```

Y en el cliente, verificar este flag antes de verificar la sesión.

### Opción 3: Mejorar SessionContext para esperar después de SIGNED_IN

Modificar `src/lib/context/SessionContext.tsx` para agregar un delay adicional después del evento `SIGNED_IN`:

```typescript
} else if (event === 'SIGNED_IN') {
  // Aumentar el debounce para dar tiempo a que las cookies se sincronicen
  if (debounceTimeout.current) {
    clearTimeout(debounceTimeout.current)
  }
  
  debounceTimeout.current = setTimeout(() => {
    // ... código existente ...
    loadSession()
  }, 800) // Aumentar de 300ms a 800ms para OAuth
}
```

### Opción 4: Usar window.location en lugar de router.push en callback

Modificar el callback para usar `window.location.href` en lugar de redirección del servidor, lo que fuerza una recarga completa de la página y sincroniza las cookies:

```typescript
// En lugar de NextResponse.redirect, retornar HTML con script
return new NextResponse(`
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="refresh" content="0;url=${next}">
      <script>
        window.location.href = '${next}';
      </script>
    </head>
    <body>Redirigiendo...</body>
  </html>
`, {
  headers: {
    'Content-Type': 'text/html',
  },
  status: 200
})
```

## 🎯 Solución Implementada: Combinación de Opción 1 y 3

✅ **IMPLEMENTADO:**

1. **Aumentar el debounce en SessionContext** después de `SIGNED_IN` a 800ms
   - Archivo: `src/lib/context/SessionContext.tsx`
   - Cambio: Debounce aumentado de 300ms a 800ms para dar tiempo a que las cookies se sincronicen

2. **Agregar verificación en DashboardLayout** para detectar callbacks de OAuth y esperar un poco más
   - Archivo: `src/app/(dashboard)/layout.tsx`
   - Cambios:
     - Detecta si viene de callback de OAuth (referrer, sessionStorage, o parámetro URL)
     - Espera 1.2 segundos adicionales antes de redirigir al login si no hay usuario
     - Fuerza recarga de sesión después de 500ms si viene de OAuth callback

3. **Modificar callback para agregar parámetro de OAuth**
   - Archivo: `src/app/auth/callback/route.ts`
   - Cambio: Agrega parámetro `oauth_callback=true` a la URL de redirección para identificar el flujo OAuth

## 📝 Notas de Implementación

- **NO modificar** archivos en áreas protegidas sin autorización
- Las modificaciones deben hacerse en:
  - `src/app/(dashboard)/layout.tsx` (no protegido)
  - `src/lib/context/SessionContext.tsx` (no protegido)
  - `src/app/auth/callback/route.ts` (no protegido)

## 🔍 Verificación

Después de aplicar la solución:
1. Hacer login con Google OAuth
2. Debe redirigir directamente al dashboard sin mostrar login intermedio
3. No debe aparecer la pantalla de login duplicada

## ⚠️ Consideraciones

- El delay adicional puede hacer que la carga inicial sea un poco más lenta (800ms)
- Esto es aceptable para resolver el problema de UX del doble login
- Alternativamente, se puede usar un indicador de carga mientras se sincroniza la sesión

