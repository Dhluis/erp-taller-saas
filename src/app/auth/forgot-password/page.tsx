'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { AuthLogo } from '@/components/auth/AuthLogo'
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (resetError) {
        console.error('❌ [ForgotPassword] Error:', resetError)
      }
      // Siempre mostrar mensaje genérico (no revelar si el email existe)
      setSent(true)
    } catch (err: any) {
      console.error('💥 [ForgotPassword] Excepción:', err)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_55%)]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="relative">
            <AuthLogo size="lg" showText={false} />
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50" />
          </div>
        </div>

        {/* Card */}
        <div className="relative bg-slate-900/80 rounded-2xl shadow-2xl p-8 border border-slate-800 backdrop-blur">
          <div className="absolute -top-10 right-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />

          {!sent ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-white">Recuperar Contraseña</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/40 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
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
                      autoComplete="email"
                      placeholder="tu@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-slate-700 bg-slate-800/80 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Enlace de Recuperación'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-white">Revisa tu correo</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Si el email <span className="text-white font-medium">{email}</span> está registrado,
                recibirás un enlace de recuperación en los próximos minutos.
              </p>
              <p className="text-xs text-slate-500">
                Revisa también tu carpeta de spam.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Login
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          © 2026 Confia Drive. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
