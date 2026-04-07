'use client'

export const dynamic = 'force-dynamic'

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
  const oauthCallbackChecked = useRef(false)

  // Obtener sesión - DEBE estar fuera de cualquier bloque condicional
  const session = useSession()

  // Extraer valores de forma segura
  const user = session?.user ?? null
  const organizationId = session?.organizationId ?? null
  const isLoading = session?.isLoading ?? true
  const isReady = session?.isReady ?? false
  const sessionError = session?.error ?? null

  // Debug: Log del estado completo de la sesión
  useEffect(() => {
    console.log('[DashboardLayout] 📊 Estado completo de sesión:', {
      hasSession: !!session,
      user: user ? { id: user.id, email: user.email } : null,
      organizationId,
      isLoading,
      isReady,
      error: sessionError,
      profile: session?.profile ? { id: session.profile.id, email: session.profile.email } : null
    })
  }, [session, user, organizationId, isLoading, isReady, sessionError])

  // ✅ FIX: Detectar si viene de callback de OAuth y forzar recarga de sesión
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Verificar si venimos de un callback de OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const hasOAuthCallbackParam = urlParams.has('oauth_callback')
    const isFromOAuthCallback = 
      document.referrer.includes('/auth/callback') ||
      sessionStorage.getItem('oauth_callback') === 'true' ||
      hasOAuthCallbackParam

    if (isFromOAuthCallback && !oauthCallbackChecked.current) {
      console.log('[DashboardLayout] 🔄 Detectado callback de OAuth, forzando recarga de sesión...')
      oauthCallbackChecked.current = true
      
      // Limpiar el flag de sessionStorage y parámetro de URL
      sessionStorage.removeItem('oauth_callback')
      if (hasOAuthCallbackParam) {
        // Limpiar el parámetro de la URL sin recargar la página
        urlParams.delete('oauth_callback')
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
      
      // Forzar recarga de sesión después de un delay para dar tiempo a que las cookies se sincronicen
      if (session?.refresh) {
        // Esperar un poco más para OAuth (las cookies pueden tardar en sincronizarse)
        setTimeout(() => {
          console.log('[DashboardLayout] 🔄 Forzando recarga de sesión después de callback OAuth...')
          session.refresh().catch((error) => {
            console.error('[DashboardLayout] ❌ Error al refrescar sesión:', error)
            // Si falla, intentar recargar la página después de otro delay
            setTimeout(() => {
              console.log('[DashboardLayout] 🔄 Recargando página como fallback...')
              window.location.reload()
            }, 1000)
          })
        }, 1000) // Aumentado a 1 segundo para dar más tiempo a las cookies
      } else {
        // Si no hay método refresh, recargar la página directamente
        setTimeout(() => {
          console.log('[DashboardLayout] 🔄 No hay método refresh, recargando página...')
          window.location.reload()
        }, 1500)
      }
    }
  }, [session])

  // Redirigir al login si no hay usuario y la sesión está lista
  // ✅ FIX: Agregar delay adicional si viene de OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Si venimos de OAuth callback, esperar un poco más antes de redirigir
    const urlParams = new URLSearchParams(window.location.search)
    const isFromOAuthCallback = 
      document.referrer.includes('/auth/callback') ||
      sessionStorage.getItem('oauth_callback') === 'true' ||
      urlParams.has('oauth_callback')

    if (isReady && !isLoading && !user && !pathname?.startsWith('/auth')) {
      // Si viene de OAuth callback, esperar 1.2 segundos adicional antes de redirigir
      // Esto da tiempo a que las cookies se sincronicen completamente
      const delay = isFromOAuthCallback ? 1200 : 0
      
      const timeoutId = setTimeout(() => {
      console.log('[DashboardLayout] 🔄 Usuario no autenticado, redirigiendo al login...')
      router.push('/auth/login')
      }, delay)

      return () => clearTimeout(timeoutId)
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
  console.log('[DashboardLayout] 🎨 Renderizando layout', {
    hasUser: !!user,
    hasOrganizationId: !!organizationId,
    pathname,
    timestamp: new Date().toISOString()
  })

  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}





