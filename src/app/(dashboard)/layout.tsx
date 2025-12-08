'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppLayout } from "@/components/layout/AppLayout"
import { useSession } from '@/lib/context/SessionContext'
import { Loader2 } from 'lucide-react'

/**
 * Layout del Dashboard con redirección automática
 * 
 * Funcionalidad:
 * - Verifica si el usuario tiene organization_id
 * - Redirige automáticamente a /onboarding si no tiene organización
 * - Previene loops de redirección
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  // Obtener sesión - DEBE estar fuera de cualquier bloque condicional
  const session = useSession()

  // Extraer valores de forma segura
  const user = session?.user ?? null
  const organizationId = session?.organizationId ?? null
  const isLoading = session?.isLoading ?? true
  const isReady = session?.isReady ?? false
  const sessionError = session?.error ?? null

  // Debug: Log del estado completo de la sesión
  // VERSION: 2024-12-08-v3
  useEffect(() => {
    console.log('[DashboardLayout v3] 📊 Estado completo de sesión:', {
      version: '2024-12-08-v3',
      hasSession: !!session,
      user: user ? { id: user.id, email: user.email } : null,
      organizationId,
      isLoading,
      isReady,
      error: sessionError,
      profile: session?.profile ? { id: session.profile.id, email: session.profile.email } : null
    })
  }, [session, user, organizationId, isLoading, isReady, sessionError])

  // Redirigir al login si no hay usuario y la sesión está lista
  useEffect(() => {
    if (isReady && !isLoading && !user && !pathname?.startsWith('/auth')) {
      console.log('[DashboardLayout] 🔄 Usuario no autenticado, redirigiendo al login...')
      router.push('/auth/login')
    }
  }, [isReady, isLoading, user, pathname, router])

  useEffect(() => {
    console.log('[DashboardLayout] 🔍 useEffect ejecutado:', {
      isLoading,
      isReady,
      hasUser: !!user,
      hasOrganizationId: !!organizationId,
      pathname,
      hasRedirected: hasRedirected.current
    })

    // No hacer nada mientras está cargando
    if (isLoading) {
      console.log('[DashboardLayout] ⏳ Cargando sesión...')
      return
    }

    // Si no hay usuario, no hacer nada (el useEffect anterior manejará la redirección)
    if (!user) {
      console.log('[DashboardLayout] ❌ No hay usuario')
      return
    }

    // Si ya estamos en onboarding o auth, no hacer nada
    if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth/')) {
      console.log('[DashboardLayout] ✅ En ruta permitida:', pathname)
      hasRedirected.current = false
      return
    }

    // Si el usuario está autenticado pero no tiene organization_id (null, undefined, string vacío), redirigir a onboarding
    if (!organizationId || organizationId === '' || organizationId === 'null' || organizationId === 'undefined') {
      // Si estamos en onboarding, no redirigir (evitar loops)
      if (pathname?.startsWith('/onboarding')) {
        console.log('[DashboardLayout] ✅ Ya estamos en onboarding, no redirigir')
        hasRedirected.current = false
        return
      }

      if (hasRedirected.current) {
        console.log('[DashboardLayout] ⏸️ Ya se intentó redirigir, pero aún estamos aquí')
        console.log('[DashboardLayout] 🔄 Forzando redirección con window.location...')
        window.location.href = '/onboarding'
        return
      }

      console.log('[DashboardLayout] 🔄 Usuario sin organization_id detectado')
      console.log('[DashboardLayout] 🔄 Valor de organizationId:', organizationId)
      console.log('[DashboardLayout] 📍 Pathname actual:', pathname)
      console.log('[DashboardLayout] 🔄 Redirigiendo a /onboarding...')
      
      hasRedirected.current = true
      
      // Intentar primero con router.push
      router.push('/onboarding')
      console.log('[DashboardLayout] ✅ router.push ejecutado')
      
      // Si después de un tiempo el pathname no cambió, usar window.location como fallback
      const timeoutId = setTimeout(() => {
        const currentPath = window.location.pathname
        console.log('[DashboardLayout] 🔍 Verificando redirección, pathname actual:', currentPath)
        if (!currentPath.startsWith('/onboarding')) {
          console.log('[DashboardLayout] ⚠️ router.push no funcionó después de 1s, usando window.location')
          window.location.href = '/onboarding'
        } else {
          console.log('[DashboardLayout] ✅ Redirección exitosa')
        }
      }, 1000)
      
      // Cleanup del timeout si el componente se desmonta o cambia algo
      return () => {
        clearTimeout(timeoutId)
      }
    }

    console.log('[DashboardLayout] ✅ Usuario con organización:', organizationId)
    hasRedirected.current = false
  }, [isLoading, user, organizationId, pathname, router])

  // Mostrar loading mientras se verifica la sesión
  // IMPORTANTE: Si isReady es true pero isLoading también, hay un problema
  if (isLoading && !isReady) {
    console.log('[DashboardLayout] ⏳ Mostrando loading (isLoading=true, isReady=false)')
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si está listo pero no hay usuario, mostrar loading mientras redirige
  if (isReady && !isLoading && !user) {
    console.log('[DashboardLayout] 🔄 Usuario no autenticado, mostrando loading mientras redirige...')
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  // Si el usuario está autenticado pero no tiene organización, mostrar loading mientras redirige
  if (user && (!organizationId || organizationId === '' || organizationId === 'null') && !pathname?.startsWith('/onboarding')) {
    console.log('[DashboardLayout] 🎨 Mostrando loading mientras redirige...')
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





