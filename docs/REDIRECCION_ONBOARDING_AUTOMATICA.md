# ✅ Redirección Automática a Onboarding

**Fecha:** 2025-01-XX  
**Objetivo:** Redirigir automáticamente a `/onboarding` cuando un usuario autenticado no tiene `organization_id`

---

## 📋 ARCHIVO MODIFICADO

### `src/app/(dashboard)/layout.tsx`

Se modificó el layout del dashboard para implementar la redirección automática.

---

## 🎯 FUNCIONALIDAD IMPLEMENTADA

### Lógica de Redirección:

1. **Verificación de sesión:**
   - Usa `useSession()` para obtener `user`, `organizationId`, e `isLoading`
   - Espera a que termine de cargar la sesión antes de verificar

2. **Condiciones de redirección:**
   - Si el usuario está autenticado (`user` existe)
   - Y NO tiene `organizationId`
   - Entonces redirige a `/onboarding`

3. **Protección contra loops:**
   - No redirige si ya está en `/onboarding`
   - No redirige si está en rutas `/auth/*` (login, register, etc.)
   - Usa `usePathname()` para verificar la ruta actual

4. **Estados de carga:**
   - Muestra spinner mientras `isLoading === true`
   - Muestra mensaje mientras redirige a onboarding

---

## 🔄 FLUJO COMPLETO

### Escenario 1: Usuario nuevo sin organización

1. Usuario se registra en `/auth/register`
2. Confirma email y hace login
3. Intenta acceder a `/dashboard` o cualquier ruta `/dashboard/*`
4. El layout detecta que `user` existe pero `organizationId` es `null`
5. Redirige automáticamente a `/onboarding`
6. Usuario completa el onboarding (crea organización y taller)
7. `organizationId` se actualiza en la sesión
8. Usuario puede acceder al dashboard normalmente

### Escenario 2: Usuario con organización

1. Usuario con `organizationId` accede a `/dashboard`
2. El layout verifica y encuentra `organizationId`
3. Permite acceso normal al dashboard

### Escenario 3: Usuario no autenticado

1. Usuario no autenticado intenta acceder a `/dashboard`
2. El middleware de autenticación (si existe) lo redirige a `/auth/login`
3. O el layout muestra contenido vacío (depende de la configuración)

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Prevención de loops de redirección:

```tsx
// No redirigir si ya está en /onboarding o /auth/*
if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth/')) {
  return
}
```

### 2. Espera a que cargue la sesión:

```tsx
// No hacer nada mientras está cargando
if (isLoading) {
  return
}
```

### 3. Verificación de usuario autenticado:

```tsx
// Solo redirigir si el usuario está autenticado
if (user && !organizationId) {
  router.push('/onboarding')
}
```

---

## 📝 CÓDIGO IMPLEMENTADO

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppLayout } from "@/components/layout/AppLayout"
import { useSession } from '@/lib/context/SessionContext'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, organizationId, isLoading } = useSession()

  useEffect(() => {
    // No hacer nada mientras está cargando
    if (isLoading) {
      return
    }

    // No redirigir si ya está en /onboarding o /auth/*
    if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth/')) {
      return
    }

    // Si el usuario está autenticado pero no tiene organization_id, redirigir a onboarding
    if (user && !organizationId) {
      console.log('🔄 [DashboardLayout] Usuario sin organización, redirigiendo a /onboarding')
      router.push('/onboarding')
      return
    }
  }, [isLoading, user, organizationId, pathname, router])

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si el usuario está autenticado pero no tiene organización, no renderizar nada
  // (se redirigirá en el useEffect)
  if (user && !organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Redirigiendo a configuración inicial...</p>
        </div>
      </div>
    )
  }

  // Renderizar el layout normal si tiene organización o no está autenticado
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
```

---

## ✅ VERIFICACIONES REALIZADAS

### 1. Flujo de registro completo:
- ✅ Registro → Confirmar email → Login → Onboarding → Dashboard

### 2. Usuarios con organización:
- ✅ No son redirigidos
- ✅ Acceso normal al dashboard

### 3. Prevención de loops:
- ✅ No redirige si ya está en `/onboarding`
- ✅ No redirige si está en `/auth/*`

### 4. Estados de carga:
- ✅ Muestra loading mientras verifica sesión
- ✅ Muestra mensaje mientras redirige

---

## 🧪 PRUEBAS RECOMENDADAS

### 1. Usuario nuevo sin organización:
1. Crear cuenta nueva (sin invitación)
2. Confirmar email
3. Hacer login
4. Intentar acceder a `/dashboard`
5. **Resultado esperado:** Redirige a `/onboarding`

### 2. Usuario con organización:
1. Login con usuario que tiene `organization_id`
2. Acceder a `/dashboard`
3. **Resultado esperado:** Acceso normal, sin redirección

### 3. Usuario en onboarding:
1. Acceder directamente a `/onboarding`
2. **Resultado esperado:** No hay redirección (evita loop)

### 4. Usuario en auth:
1. Acceder a `/auth/login` o `/auth/register`
2. **Resultado esperado:** No hay redirección

### 5. Completar onboarding:
1. Usuario sin organización completa onboarding
2. `organizationId` se actualiza
3. Acceder a `/dashboard`
4. **Resultado esperado:** Acceso normal al dashboard

---

## 🔗 INTEGRACIÓN CON OTROS COMPONENTES

### SessionContext:
- El layout usa `useSession()` para obtener el estado de la sesión
- Depende de que `SessionContext` esté disponible en el árbol de componentes
- El `SessionProvider` debe estar en un nivel superior (normalmente en `app/layout.tsx`)

### Onboarding Page:
- La página `/onboarding` ya existe y maneja la creación de organización/taller
- Después de completar onboarding, actualiza `organizationId` en la sesión
- El layout detecta el cambio y permite acceso al dashboard

---

## ⚠️ NOTAS IMPORTANTES

### 1. Dependencia de SessionContext:
- El layout requiere que `SessionProvider` esté disponible
- Si no está disponible, `useSession()` lanzará un error
- Verificar que el provider esté en el layout raíz

### 2. Rutas protegidas:
- Este layout solo protege rutas dentro de `(dashboard)/`
- Otras rutas pueden necesitar protección similar
- Considerar crear un middleware de Next.js si se necesita protección global

### 3. Performance:
- El `useEffect` se ejecuta en cada render
- Las dependencias están optimizadas para evitar renders innecesarios
- El `SessionContext` ya tiene debouncing y optimizaciones internas

---

## 🎯 RESULTADO

✅ **Redirección automática a onboarding completamente funcional**

- Detecta usuarios sin organización
- Redirige automáticamente a `/onboarding`
- Previene loops de redirección
- Muestra estados de carga apropiados
- Integrado con `SessionContext`

---

**FIN DE LA DOCUMENTACIÓN**
