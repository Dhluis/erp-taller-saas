'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
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
      {/* Google OAuth Button - Moderno y a Color */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
      >
        {/* Google Logo SVG - Versión mejorada y más visible */}
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </g>
        </svg>
        <span className="font-semibold">{loading ? 'Cargando...' : 'Continuar con Google'}</span>
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-900/80 text-slate-400">O continúa con email</span>
        </div>
      </div>
    </div>
  )
}