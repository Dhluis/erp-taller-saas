'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Github, Mail } from 'lucide-react'

interface OAuthButtonsProps {
  redirectTo?: string
}

export function OAuthButtons({ redirectTo = '/dashboard' }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      setLoading(provider)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        }
      })

      if (error) {
        console.error('Error with OAuth login:', error)
      }
    } catch (error) {
      console.error('Error initiating OAuth login:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOAuthLogin('github')}
          disabled={loading === 'github'}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Github className="w-5 h-5" />
          {loading === 'github' ? 'Cargando...' : 'GitHub'}
        </button>

        <button
          onClick={() => handleOAuthLogin('google')}
          disabled={loading === 'google'}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-5 h-5" />
          {loading === 'google' ? 'Cargando...' : 'Google'}
        </button>
      </div>

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