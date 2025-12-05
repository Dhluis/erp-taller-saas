'use client'

import { useEffect, useRef } from 'react'
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
  const hasRedirected = useRef(false)

  // Obtener sesión de forma segura
  let session
  try {
    session = useSession()
  } catch (error) {
    console.error('❌ [DashboardLayout] Error obteniendo sesión:', error)
    // Si no hay provider, renderizar normalmente (el middleware manejará la autenticación)
    return (
      <AppLayout>
        {children}
      </AppLayout>
    )
  }

  // Extraer valores de forma segura
  const user = session?.user ?? null
  const organizationId = session?.organizationId ?? null
  const isLoading = session?.isLoading ?? true

  useEffect(() => {
    // No hacer nada mientras está cargando
    if (isLoading) {
      return
    }

    // Resetear flag si cambia el pathname a una ruta permitida
    if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/auth/')) {
      hasRedirected.current = false
      return
    }

    // Si el usuario está autenticado pero no tiene organization_id, redirigir a onboarding
    if (user && !organizationId && !hasRedirected.current) {
      console.log('🔄 [DashboardLayout] Usuario sin organización, redirigiendo a /onboarding')
      hasRedirected.current = true
      router.push('/onboarding')
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

  // Si el usuario está autenticado pero no tiene organización, mostrar loading mientras redirige
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




