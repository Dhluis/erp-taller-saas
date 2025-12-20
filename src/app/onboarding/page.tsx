'use client'

/**
 * ⚠️ ESTA PÁGINA ESTÁ DEPRECADA Y DESACTIVADA
 * 
 * El flujo de registro en /auth/register ya crea la organización y el usuario
 * con organization_id. Este onboarding es redundante y causa confusión.
 * 
 * Esta página se mantiene solo para evitar errores 404 si hay referencias antiguas.
 * Se redirige automáticamente al dashboard.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente al dashboard
    // El registro ya crea la organización, no se necesita onboarding
    router.replace('/dashboard')
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
