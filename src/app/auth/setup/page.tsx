'use client'

/**
 * ⚠️ ESTA PÁGINA ESTÁ DEPRECADA Y NO ES FUNCIONAL
 * 
 * Esta página intenta usar la tabla 'user_profiles' que no existe en el schema actual.
 * El sistema ahora usa la tabla 'users' y el flujo de onboarding está en /onboarding
 * 
 * Esta página se mantiene solo para evitar errores 404 si hay referencias antiguas.
 * Se redirige automáticamente a /onboarding que es la página funcional.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente a /onboarding que es la página funcional
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" />
        <p className="text-slate-400">Redirigiendo...</p>
      </div>
    </div>
  )
}


















