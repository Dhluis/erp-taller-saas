# 🔄 Corrección: Redirección a /onboarding

**Fecha:** 2025-01-XX  
**Problema:** La redirección a `/onboarding` no estaba funcionando correctamente

---

## ❌ PROBLEMA REPORTADO

- El SessionContext detecta correctamente que `organization_id` es null
- Muestra log: "Usuario sin organization_id - será redirigido a onboarding"
- **PERO no redirige**, el usuario se queda en `/dashboard`

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Archivo modificado: `src/app/(dashboard)/layout.tsx`

**Cambios realizados:**

1. ✅ **Logs detallados agregados** en cada paso del proceso
2. ✅ **Redirección robusta** con `router.push` + fallback con `window.location.href`
3. ✅ **Verificación de pathname** antes de redirigir para evitar loops
4. ✅ **Timeout con fallback** si `router.push` no funciona después de 1 segundo

---

## 🔍 LOGS AGREGADOS

Ahora verás en la consola:

```
[DashboardLayout] 🔍 useEffect ejecutado: { isLoading, hasUser, hasOrganizationId, pathname, hasRedirected }
[DashboardLayout] ⏳ Cargando sesión...
[DashboardLayout] 🔄 Usuario sin organization_id detectado
[DashboardLayout] 📍 Pathname actual: /dashboard
[DashboardLayout] 🔄 Redirigiendo a /onboarding...
[DashboardLayout] ✅ router.push ejecutado
[DashboardLayout] 🔍 Verificando redirección, pathname actual: ...
```

---

## 🔧 LÓGICA DE REDIRECCIÓN

### Flujo actualizado:

1. **Verificar si está cargando** → Esperar
2. **Verificar si hay usuario** → Si no, no hacer nada (middleware maneja)
3. **Verificar si ya está en `/onboarding`** → Si sí, no hacer nada
4. **Verificar si tiene `organization_id`**:
   - Si NO tiene → Redirigir a `/onboarding`
   - Primero intenta con `router.push('/onboarding')`
   - Si después de 1 segundo no cambió, usa `window.location.href = '/onboarding'`
   - Si ya intentó redirigir antes, fuerza con `window.location.href` inmediatamente

---

## 🎯 MEJORAS ESPECÍFICAS

### 1. Logs detallados:
- Cada paso del proceso está logueado
- Estado completo del componente en cada ejecución
- Verificación de si la redirección funcionó

### 2. Fallback robusto:
```typescript
// Primera vez: intenta con router.push
router.push('/onboarding')

// Fallback: si no funciona en 1 segundo, usa window.location
setTimeout(() => {
  if (!window.location.pathname.startsWith('/onboarding')) {
    window.location.href = '/onboarding'
  }
}, 1000)

// Si ya intentó antes: fuerza inmediatamente
if (hasRedirected.current) {
  window.location.href = '/onboarding'
}
```

### 3. Prevención de loops:
- Verifica si ya está en `/onboarding` antes de redirigir
- Usa `hasRedirected.current` para evitar múltiples intentos
- Resetea el flag cuando está en ruta permitida

---

## 🧪 CÓMO VERIFICAR

1. **Abrir consola del navegador** (F12 → Console)
2. **Acceder a `/dashboard` sin `organization_id`**
3. **Observar los logs:**
   - Deberías ver: `🔄 Redirigiendo a /onboarding...`
   - Deberías ver: `✅ router.push ejecutado`
   - Si funciona: `✅ Redirección exitosa`
   - Si no funciona: `⚠️ router.push no funcionó, usando window.location`

---

## 🔍 POSIBLES CAUSAS DEL PROBLEMA ANTERIOR

1. **Router.push no se ejecutaba** → Ahora forzado con `window.location` como fallback
2. **Timing issue** → Agregado timeout para verificar si funcionó
3. **Flag bloqueando** → Mejorada la lógica de `hasRedirected`
4. **Pathname no actualizado** → Verificación mejorada con `window.location.pathname`

---

## 📝 NOTAS TÉCNICAS

- El `useEffect` tiene todas las dependencias correctas: `[isLoading, user, organizationId, pathname, router]`
- El cleanup del timeout está implementado correctamente
- El render condicional previene mostrar el dashboard mientras redirige
- Compatible con Next.js 15 App Router

---

**FIN DE LA CORRECCIÓN**
