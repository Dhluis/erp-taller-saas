'use client'

import { Suspense } from 'react'
import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithProfile } from '@/lib/auth/client-auth'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { AuthLogo } from '@/components/auth/AuthLogo'
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false)
  const [registerEmail, setRegisterEmail] = useState('')

  // Verificar si hay errores del callback o mensajes
  React.useEffect(() => {
    const errorParam = searchParams?.get('error')
    const messageParam = searchParams?.get('message')
    const actionParam = searchParams?.get('action')
    const emailParam = searchParams?.get('email')
    
    if (errorParam && messageParam) {
      setError(messageParam)
    } else if (errorParam === 'invalid_token') {
      setError('El enlace de confirmación es inválido o ha expirado. Por favor, solicita un nuevo enlace.')
    } else if (errorParam === 'auth_failed') {
      setError('No se pudo completar la autenticación. Por favor, intenta de nuevo.')
    } else if (messageParam && actionParam === 'register') {
      // Usuario OAuth sin cuenta: mostrar mensaje y botón de registro
      setShowRegisterPrompt(true)
      setError('')
      if (emailParam) {
        setRegisterEmail(emailParam)
        setEmail(emailParam) // Pre-llenar email
      }
    }
  }, [searchParams])

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

      // Esperar un momento para que la sesión se establezca
      console.log('✅ [Login] Login exitoso, esperando establecimiento de sesión...')
      
      // Pequeño delay para asegurar que la sesión se establezca
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect to the page they were trying to access, or dashboard
      const redirectTo = searchParams?.get('redirectTo') || '/dashboard'
      console.log('🔄 [Login] Redirigiendo a:', redirectTo)
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
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="relative">
            <AuthLogo size="lg" showText={false} />
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              EAGLES SYSTEM
            </h1>
            <p className="text-sm text-slate-400">
              Bienvenido de vuelta a tu sistema de gestión de taller
            </p>
          </div>
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-12 py-3 border border-slate-700 bg-slate-800/80 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
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
          © 2026 EAGLES. Todos los derechos reservados.
        </p>
      </div>

      {/* Dialog para usuarios OAuth sin cuenta */}
      <Dialog open={showRegisterPrompt} onOpenChange={setShowRegisterPrompt}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-white text-center">
              Crea tu cuenta primero
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-center mt-2">
              Para usar Google como método de inicio de sesión, primero debes crear tu cuenta en Eagles System.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <p className="text-slate-400 text-center text-sm">
              El proceso es rápido y fácil. Una vez creada tu cuenta, podrás usar Google para iniciar sesión.
            </p>
            <Link
              href={`/auth/register${registerEmail ? `?email=${encodeURIComponent(registerEmail)}` : ''}`}
              className="w-full block bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg transition text-center shadow-lg shadow-cyan-500/25"
              onClick={() => setShowRegisterPrompt(false)}
            >
              Crear Cuenta Gratis
            </Link>
            <button
              onClick={() => setShowRegisterPrompt(false)}
              className="w-full text-slate-400 hover:text-slate-300 text-sm font-medium py-2 transition"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
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

