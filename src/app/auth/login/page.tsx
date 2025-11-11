'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithProfile } from '@/lib/auth/client-auth'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { AuthLogo } from '@/components/auth/AuthLogo'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signInWithProfile(email, password)
      
      if (result.error) {
        if (result.error.message.includes('Invalid login credentials')) {
          setError('Usuario o contraseña incorrectos')
        } else {
          setError(result.error.message)
        }
        setLoading(false)
        return
      }

      // Redirect to the page they were trying to access, or dashboard
      const redirectTo = searchParams?.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)
      setError('Error al iniciar sesión. Por favor, intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_55%)]" />
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <AuthLogo size="lg" showText={true} />
          <p className="text-sm text-slate-400 text-center">
            Bienvenido de vuelta a tu sistema de gestión de taller
          </p>
        </div>

        {/* Login Form */}
        <div className="relative bg-slate-900/80 rounded-2xl shadow-2xl p-8 border border-slate-800 backdrop-blur">
          <div className="absolute -top-10 right-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-slate-700 bg-slate-800/80 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-slate-700 bg-slate-800/80 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-cyan-500 border-slate-600 bg-slate-800 rounded focus:ring-cyan-500"
                />
                <span className="text-slate-300">Recordarme</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-900/80 text-slate-400">O continúa con</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <OAuthButtons />

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-cyan-400 hover:text-cyan-300 transition"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          © 2024 EAGLES. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

