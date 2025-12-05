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




