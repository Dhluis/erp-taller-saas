'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { useSession } from '@/lib/context/SessionContext'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, organizationId, isLoading, refresh } = useSession()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Datos de la organización
  const [orgName, setOrgName] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [orgAddress, setOrgAddress] = useState('')

  // Datos del taller
  const [workshopName, setWorkshopName] = useState('Taller Principal')
  const [workshopEmail, setWorkshopEmail] = useState('')
  const [workshopPhone, setWorkshopPhone] = useState('')
  const [workshopAddress, setWorkshopAddress] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verificar autenticación y si ya tiene organización
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true)
      
      // Esperar a que SessionContext termine de cargar
      if (isLoading) {
        return
      }

      // Si no hay usuario, redirigir al login
      if (!user) {
        router.push('/auth/login?redirectTo=/onboarding')
        return
      }

      // Si ya tiene organization_id, redirigir al dashboard
      if (organizationId) {
        console.log('✅ Usuario ya tiene organización, redirigiendo al dashboard')
        router.push('/dashboard')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [user, organizationId, isLoading, router])

  // Heredar email de organización al taller
  useEffect(() => {
    if (step === 3 && orgEmail && !workshopEmail) {
      setWorkshopEmail(orgEmail)
    }
  }, [step, orgEmail, workshopEmail])

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')

    // Validaciones por paso
    if (step === 1) {
      // No hay validaciones en el paso 1 (bienvenida)
      setStep(2)
      return
    }

    if (step === 2) {
      // Validar datos de organización
      if (!orgName || !orgEmail) {
        setError('Por favor completa todos los campos obligatorios de la organización')
        return
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(orgEmail)) {
        setError('Por favor ingresa un email válido')
        return
      }

      setStep(3)
      return
    }

    if (step === 3) {
      // Validar datos del taller
      if (!workshopName) {
        setError('Por favor ingresa el nombre del taller')
        return
      }

      setStep(4)
      return
    }
  }

  const handleBack = () => {
    setError('')
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // PASO 1: Crear organización
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          email: orgEmail,
          phone: orgPhone || null,
          address: orgAddress || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orgError) {
        throw new Error(`Error al crear la organización: ${orgError.message}`)
      }

      if (!organization) {
        throw new Error('No se pudo crear la organización')
      }

      // PASO 2: Crear taller/sucursal
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .insert({
          name: workshopName,
          email: workshopEmail || orgEmail,
          phone: workshopPhone || orgPhone || null,
          address: workshopAddress || orgAddress || null,
          organization_id: organization.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (workshopError) {
        // Rollback: eliminar organización si falla el taller
        await supabase.from('organizations').delete().eq('id', organization.id)
        throw new Error(`Error al crear el taller: ${workshopError.message}`)
      }

      if (!workshop) {
        // Rollback: eliminar organización si no se creó el taller
        await supabase.from('organizations').delete().eq('id', organization.id)
        throw new Error('No se pudo crear el taller')
      }

      // PASO 3: Actualizar usuario con organization_id y workshop_id
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: organization.id,
          workshop_id: workshop.id,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id)

      if (updateError) {
        // Rollback: eliminar organización y taller
        await supabase.from('workshops').delete().eq('id', workshop.id)
        await supabase.from('organizations').delete().eq('id', organization.id)
        throw new Error(`Error al actualizar el usuario: ${updateError.message}`)
      }

      // PASO 4: Refrescar sesión para que SessionContext detecte los cambios
      await refresh()

      // Redirigir al dashboard
      router.push('/dashboard')
      router.refresh()

    } catch (err: any) {
      console.error('Error en onboarding:', err)
      setError(err.message || 'Error al completar el onboarding. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica autenticación
  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Verificando...</p>
        </div>
      </div>
    )
  }

  const steps = [
    { number: 1, title: 'Bienvenida' },
    { number: 2, title: 'Organización' },
    { number: 3, title: 'Taller' },
    { number: 4, title: 'Confirmación' }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0f1e]">
      <div className="w-full max-w-3xl">
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
            Configuración Inicial
          </h1>
          <p className="text-slate-400">
            Completa tu perfil para comenzar a usar Eagles ERP
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition ${
                  step > s.number 
                    ? 'bg-cyan-500' 
                    : step === s.number 
                    ? 'bg-cyan-500 ring-4 ring-cyan-500/30' 
                    : 'bg-slate-700'
                }`}>
                  {step > s.number ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-white font-bold">{s.number}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 transition ${
                    step > s.number ? 'bg-cyan-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card de Onboarding */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          {/* PASO 1: Bienvenida */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-cyan-400" />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  ¡Bienvenido a Eagles ERP!
                </h2>
                <p className="text-slate-300 mb-4">
                  Estamos emocionados de tenerte aquí. Para comenzar, necesitamos configurar tu organización y taller.
                </p>
                <p className="text-slate-400 text-sm">
                  Este proceso solo tomará unos minutos y te permitirá comenzar a gestionar tu negocio de manera eficiente.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mt-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-white">¿Qué necesitarás?</strong>
                </p>
                <ul className="text-left text-slate-400 text-sm mt-2 space-y-1">
                  <li>• Información de tu empresa u organización</li>
                  <li>• Datos de tu taller o sucursal principal</li>
                </ul>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                Comenzar
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* PASO 2: Datos de la Organización */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Datos de la Organización</h2>
                <p className="text-slate-400 text-sm">Información de tu empresa o negocio</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre de la Organización */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre de la Empresa/Organización <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="Ej: Taller Mecánico Los Pinos S.A."
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email de la Organización */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="contacto@empresa.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Teléfono de la Organización */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder="+52 123 456 7890"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Dirección de la Organización */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                    <textarea
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
                      placeholder="Calle, número, colonia, ciudad, estado"
                      rows={3}
                      disabled={loading}
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
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: Datos del Taller */}
          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Datos del Taller/Sucursal</h2>
                <p className="text-slate-400 text-sm">Información de tu taller principal</p>
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
                      placeholder="Taller Principal"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email del Taller */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      value={workshopEmail}
                      onChange={(e) => setWorkshopEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                      placeholder={orgEmail || "taller@empresa.com"}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Si no se especifica, se usará el email de la organización
                  </p>
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
                      placeholder={orgPhone || "+52 123 456 7890"}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Dirección del Taller */}
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
                      placeholder={orgAddress || "Calle, número, colonia, ciudad, estado"}
                      rows={3}
                      disabled={loading}
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
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 4: Confirmación */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Resumen de Configuración</h2>
                <p className="text-slate-400 text-sm">Revisa la información antes de continuar</p>
              </div>

              {/* Resumen de Organización */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Organización
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Nombre</p>
                    <p className="text-white font-medium">{orgName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Email</p>
                    <p className="text-white font-medium">{orgEmail}</p>
                  </div>
                  {orgPhone && (
                    <div>
                      <p className="text-slate-400">Teléfono</p>
                      <p className="text-white font-medium">{orgPhone}</p>
                    </div>
                  )}
                  {orgAddress && (
                    <div className="md:col-span-2">
                      <p className="text-slate-400">Dirección</p>
                      <p className="text-white font-medium">{orgAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de Taller */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  Taller/Sucursal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Nombre</p>
                    <p className="text-white font-medium">{workshopName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Email</p>
                    <p className="text-white font-medium">{workshopEmail || orgEmail}</p>
                  </div>
                  {(workshopPhone || orgPhone) && (
                    <div>
                      <p className="text-slate-400">Teléfono</p>
                      <p className="text-white font-medium">{workshopPhone || orgPhone}</p>
                    </div>
                  )}
                  {(workshopAddress || orgAddress) && (
                    <div className="md:col-span-2">
                      <p className="text-slate-400">Dirección</p>
                      <p className="text-white font-medium">{workshopAddress || orgAddress}</p>
                    </div>
                  )}
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
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Atrás
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      Comenzar a usar Eagles ERP
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
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
