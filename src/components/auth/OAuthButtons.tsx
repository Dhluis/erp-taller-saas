'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

interface OAuthButtonsProps {
  redirectTo?: string
}

export function OAuthButtons({ redirectTo = '/dashboard' }: OAuthButtonsProps) {
  const [loading, setLoading] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        console.error('❌ Error con login de Google:', error)
        toast.error('Error al iniciar sesión con Google. Por favor, intenta de nuevo.')
        setLoading(false)
      } else {
        // El usuario será redirigido a Google, no necesitamos hacer nada más
        console.log('✅ Redirigiendo a Google OAuth...')
      }
    } catch (error) {
      console.error('❌ Error iniciando login de Google:', error)
      toast.error('Error al iniciar sesión con Google. Por favor, intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Google OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Mail className="w-5 h-5" />
        {loading ? 'Cargando...' : 'Continuar con Google'}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-800 text-slate-400">O continúa con email</span>
        </div>
      </div>
    </div>
  )
}