'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Redirección de /usuarios a /configuraciones/usuarios
 * Esta página ha sido consolidada en /configuraciones/usuarios
 */
export default function UsuariosRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/configuraciones/usuarios')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  )
}
