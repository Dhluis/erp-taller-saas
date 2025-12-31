'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUpWithProfile } from '@/lib/auth/client-auth'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Lock, User, Building2, Phone, MapPin, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Estados del formulario
  const [step, setStep] = useState(1) // 1: Datos del taller, 2: Datos del usuario
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [userExistsError, setUserExistsError] = useState(false) // Para mostrar botón de login
  
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Cliente Supabase para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Pre-llenar email si viene como parámetro (útil cuando vienen desde otras páginas)
  useEffect(() => {
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  // Efecto de confeti cuando se muestra la pantalla de bienvenida
  useEffect(() => {
    if (showConfirmation && step === 3) {
      // Disparar confeti con una configuración bonita
      const duration = 3000 // 3 segundos
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min
      }

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        // Confeti desde la izquierda
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        })

        // Confeti desde la derecha
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        })
      }, 250)

      // También disparar un burst inicial desde el centro
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [showConfirmation, step])

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
      // PASO 1: Crear la organización
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

      // PASO 2: Registrar usuario con la organización (flujo normal para todos)
      const { user, session, error: signUpError } = await signUpWithProfile({
        email,
        password: password,
        fullName,
        organizationId: organization.id
      })

      if (signUpError) {
        // ✅ DEBUG: Log del error completo para diagnosticar
        console.error('🔍 [Register] Error completo de signUp:', {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name,
          error: signUpError
        })
        
        // ✅ Manejo específico del error "User already registered"
        // Verificar tanto el mensaje como el código de error de Supabase
        const errorMessage = signUpError.message?.toLowerCase() || ''
        const errorStatus = signUpError.status || 0
        
        // Solo considerar "usuario ya existe" si el mensaje es muy específico
        const isUserExistsError = 
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email address is already registered') ||
          errorMessage === 'user already registered' ||
          (errorStatus === 422 && errorMessage.includes('already registered'))
        
        console.log('🔍 [Register] ¿Es error de usuario existente?', {
          isUserExistsError,
          errorMessage,
          errorStatus
        })
        
        // Si falla el registro, eliminar la organización creada
        try {
          await supabase.from('organizations').delete().eq('id', organization.id)
        } catch (deleteError) {
          console.warn('Error al eliminar organización:', deleteError)
        }
        
        if (isUserExistsError) {
          // ✅ Mostrar mensaje amigable y ofrecer ir al login
          setError(`El email ${email} ya está registrado. ¿Ya tienes una cuenta?`)
          setUserExistsError(true) // Activar flag para mostrar botón de login
        } else {
          // ✅ Si NO es error de usuario existente, mostrar el error real
          setUserExistsError(false)
          throw signUpError
        }
        setLoading(false)
        return
      }

      // Mostrar mensaje de bienvenida
      setRegisteredEmail(email)
      setShowConfirmation(true)
      setStep(3) // Mostrar paso de bienvenida
      
    } catch (err: any) {
      console.error('❌ [Register] Error en registro:', err)
      console.error('❌ [Register] Detalles del error:', {
        message: err.message,
        status: err.status,
        name: err.name,
        stack: err.stack
      })
      
      // ✅ Mejorar mensajes de error específicos
      // Solo considerar "usuario ya existe" si el mensaje es muy específico
      const errorMessage = (err.message || '').toLowerCase()
      const errorStatus = err.status || 0
      
      const isUserExistsError = 
        errorMessage.includes('user already registered') ||
        errorMessage.includes('email address is already registered') ||
        errorMessage === 'user already registered' ||
        (errorStatus === 422 && errorMessage.includes('already registered'))
      
      console.log('🔍 [Register] ¿Es error de usuario existente en catch?', {
        isUserExistsError,
        errorMessage,
        errorStatus
      })
      
      if (isUserExistsError) {
        setError(`El email ${email} ya está registrado. ¿Ya tienes una cuenta?`)
        setUserExistsError(true) // Activar flag para mostrar botón de login
      } else {
        setUserExistsError(false)
        // Mostrar el mensaje de error real
        setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.')
      }
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
              alt="Logo Eagles System"
              width={160}
              height={80}
              className="h-16 w-auto rounded-2xl object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Crear Cuenta en Eagles System
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
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
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {/* Confirmar Contraseña */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar Contraseña <span className="text-red-400">*</span>
                    </label>
                  <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

              {error && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                  {userExistsError && (
                    <Link
                      href={`/auth/login?email=${encodeURIComponent(email)}`}
                      className="block w-full text-center bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition"
                    >
                      Ir a Iniciar Sesión
                    </Link>
                  )}
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

          {/* STEP 3: Confirmación de Email */}
          {step === 3 && showConfirmation && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-cyan-400" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  ¡Bienvenido a Eagles System!
                </h2>
                <p className="text-slate-300 mb-4">
                  Tu cuenta ha sido creada exitosamente con el email:
                </p>
                <p className="text-cyan-400 font-medium mb-6">
                  {registeredEmail}
                </p>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                  <p className="text-cyan-300 text-sm font-medium mb-2">
                    🎉 Estás en tu período de prueba gratuito de 7 días
                  </p>
                  <p className="text-slate-300 text-sm">
                    Explora todas las funcionalidades del ERP sin compromiso. Podrás gestionar tu taller de manera completa.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    router.push('/dashboard')
                  }}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition"
                >
                  Comenzar a usar el sistema
                </button>
              </div>
            </div>
          )}

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <p className="text-slate-400">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  href="/auth/login"
                className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2026 EAGLES SYSTEM. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}