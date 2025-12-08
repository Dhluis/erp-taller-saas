'use client'
// v2024-12-08: Redirect to login after registration

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpWithProfile } from '@/lib/auth/client-auth'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Lock, User, Building2, Phone, MapPin, AlertCircle, Loader2, CheckCircle, MailCheck, RefreshCw } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  
  // Estados del formulario
  const [step, setStep] = useState(1) // 1: Datos del taller, 2: Datos del usuario
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  
  // Datos del taller
  const [workshopName, setWorkshopName] = useState('')
  const [workshopEmail, setWorkshopEmail] = useState('')
  const [workshopPhone, setWorkshopPhone] = useState('')
  const [workshopAddress, setWorkshopAddress] = useState('')
  
  // Datos del usuario
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Cliente Supabase para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar campos del taller
    if (!workshopName || !workshopEmail) {
      setError('Por favor completa todos los campos obligatorios del taller')
      return
    }
    
    setError('')
    setStep(2)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
          return
        }
        
    if (!fullName || !email || !password) {
      setError('Por favor completa todos los campos obligatorios')
        return
      }

    setLoading(true)

    try {
      // PASO 1: Crear la organización (en lugar de workshop)
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: workshopName,
          email: workshopEmail,
          phone: workshopPhone,
          address: workshopAddress,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // PASO 2: Registrar usuario con la organización
      const { user, session, error: signUpError } = await signUpWithProfile({
        email,
        password,
        fullName,
        organizationId: organization.id
      })

      if (signUpError) {
        // Si falla el registro, eliminar la organización creada
        await supabase.from('organizations').delete().eq('id', organization.id)
        throw signUpError
      }

      // ✅ Registro exitoso - redirigir al login
      setRegisteredEmail(email)
      setShowConfirmation(true)
      setStep(3) // Mostrar mensaje de éxito brevemente
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
      
    } catch (err: any) {
      console.error('Error en registro:', err)
      setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0f1e]">
      <div className="w-full max-w-2xl">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Image
              src="/eagles-logo-new.png"
              alt="Logo Eagles ERP"
              width={160}
              height={80}
              className="h-16 w-auto rounded-2xl object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Crear Cuenta en Eagles ERP
          </h1>
          <p className="text-slate-400">
            Registra tu taller y comienza a gestionar tu negocio
          </p>
        </div>

        {/* Progress Steps */}
        {step < 3 && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-cyan-500' : 'bg-slate-700'
              }`}>
                {step > 1 ? <CheckCircle className="w-6 h-6 text-white" /> : <span className="text-white font-bold">1</span>}
              </div>
              <div className={`w-20 h-1 ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-700'}`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-cyan-500' : 'bg-slate-700'
              }`}>
                <span className="text-white font-bold">2</span>
              </div>
            </div>
          </div>
        )}

        {/* Card de Registro */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          {/* STEP 1: Datos del Taller */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Datos del Taller</h2>
                <p className="text-slate-400 text-sm">Información de tu negocio</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre del Taller */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre del Taller <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                  type="text"
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="Ej: Taller Mecánico Los Pinos"
                      required
                    />
                  </div>
                </div>

                {/* Email del Taller */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email del Taller <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      value={workshopEmail}
                      onChange={(e) => setWorkshopEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="contacto@taller.com"
                  required
                    />
                  </div>
                </div>

                {/* Teléfono del Taller */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={workshopPhone}
                      onChange={(e) => setWorkshopPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="+52 123 456 7890"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <textarea
                      value={workshopAddress}
                      onChange={(e) => setWorkshopAddress(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
                      placeholder="Calle, número, colonia, ciudad, estado"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition"
              >
                Continuar
              </button>
            </form>
          )}

          {/* STEP 2: Datos del Usuario */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Datos del Administrador</h2>
                <p className="text-slate-400 text-sm">Tu información personal</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre Completo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre Completo <span className="text-red-400">*</span>
                  </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                    type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="Juan Pérez"
                    required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="tu@email.com"
                      required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                  Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                  type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="+52 123 456 7890"
                  disabled={loading}
                />
                  </div>
              </div>

              {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                      minLength={6}
                    />
                </div>
              </div>

                {/* Confirmar Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmar Contraseña <span className="text-red-400">*</span>
                  </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                type="submit"
                disabled={loading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Cuenta Creada Exitosamente */}
          {step === 3 && showConfirmation && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  ¡Cuenta creada exitosamente!
                </h2>
                <p className="text-slate-300 mb-2">
                  Tu cuenta ha sido registrada con el correo:
                </p>
                <p className="text-cyan-400 font-medium mb-6">
                  {registeredEmail}
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Serás redirigido a iniciar sesión en unos segundos...
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <p className="text-slate-300 text-sm">
                    Preparando todo para ti...
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/auth/login'
                  }}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  Ir a Iniciar Sesión
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2025 EAGLES ERP Taller SaaS. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}