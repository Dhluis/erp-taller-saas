'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization, useSession } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Building2,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ONBOARDING_KEY = (orgId: string) => `onboarding_v1_${orgId}`

const STEPS = [
  { id: 1, label: 'Tu taller', icon: Building2 },
  { id: 2, label: 'Primer cliente', icon: UserPlus },
  { id: 3, label: '¡Listo!', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { organizationId, loading: orgLoading, ready } = useOrganization()
  const { companySettings, profile } = useSession()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — pre-fill from existing data
  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [website, setWebsite] = useState('')
  const [city, setCity] = useState('')

  // Pre-fill when companySettings loads
  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.company_name || '')
      setLogoUrl(companySettings.logo_url || '')
      setWebsite(companySettings.website || '')
    }
  }, [companySettings])

  // Step 2
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')

  useEffect(() => {
    if (!orgLoading && ready && organizationId) {
      if (localStorage.getItem(ONBOARDING_KEY(organizationId))) {
        router.replace('/dashboard')
      }
    }
  }, [orgLoading, ready, organizationId, router])

  const markDone = () => {
    if (organizationId) localStorage.setItem(ONBOARDING_KEY(organizationId), '1')
  }

  const handleStep1 = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/onboarding/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          company_name: companyName || undefined,
          logo_url: logoUrl || undefined,
          website: website || undefined,
          city: city || undefined,
        }),
      })
    } catch {
      // non-blocking — datos opcionales
    } finally {
      setSubmitting(false)
      setStep(2)
    }
  }

  const handleStep2 = async () => {
    if (!custName.trim() || !custEmail.trim()) {
      toast.error('Nombre y correo son requeridos')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: custName.trim(), email: custEmail.trim(), phone: custPhone.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al crear el cliente')
        return
      }
      toast.success('Cliente creado correctamente')
      markDone()
      setStep(3)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip2 = () => {
    markDone()
    setStep(3)
  }

  if (orgLoading || !ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Confia Drive ERP</h1>
        <p className="text-slate-400 text-sm mt-1">Configura tu taller en 2 minutos</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                done   ? 'bg-cyan-500/20 text-cyan-400' :
                active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' :
                         'bg-slate-700/50 text-slate-500'
              )}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn('h-3.5 w-3.5', step > s.id ? 'text-cyan-500' : 'text-slate-600')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

        {/* Step 1: Datos del taller */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-400" />
                Personaliza tu taller
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Estos datos aparecerán en tus cotizaciones y facturas. Puedes cambiarlos después.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nombre del taller en documentos</Label>
                <Input
                  placeholder="Ej. Taller Automotriz García"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500">Aparece en cotizaciones, facturas y la barra lateral</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Logo (URL de imagen)</Label>
                <Input
                  placeholder="https://tusitio.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500">Sube tu imagen a imgur.com o imgbb.com y pega el enlace directo</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Sitio web</Label>
                <Input
                  placeholder="https://tutaller.com"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Ciudad</Label>
                <Input
                  placeholder="Ej. Guadalajara, Monterrey..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-200 flex-1"
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                Omitir este paso
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
                onClick={handleStep1}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><span>Siguiente</span><ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Primer cliente */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                Agrega tu primer cliente
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Empieza a registrar tus clientes. Siempre puedes agregar más desde el módulo de Clientes.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nombre completo <span className="text-red-400">*</span></Label>
                <Input
                  placeholder="Juan García"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Correo electrónico <span className="text-red-400">*</span></Label>
                <Input
                  type="email"
                  placeholder="juan@correo.com"
                  value={custEmail}
                  onChange={e => setCustEmail(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Teléfono</Label>
                <Input
                  placeholder="+52 33 1234 5678"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-200"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-200 flex-1"
                onClick={handleSkip2}
                disabled={submitting}
              >
                Omitir
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
                onClick={handleStep2}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><span>Crear cliente</span><ArrowRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Éxito */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-cyan-400" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">¡Todo listo!</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Tu taller está configurado. Tienes <span className="text-cyan-400 font-medium">7 días de Premium gratis</span> para explorar todas las funciones.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { label: 'Órdenes de trabajo', desc: 'Registra y da seguimiento' },
                { label: 'WhatsApp', desc: 'Notifica a tus clientes' },
                { label: 'Inventario', desc: 'Controla tus refacciones' },
                { label: 'Facturación', desc: 'Genera facturas al instante' },
              ].map(f => (
                <div key={f.label} className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/30">
                  <p className="text-white text-xs font-medium">{f.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-base shadow-lg shadow-cyan-500/20"
              onClick={() => router.replace('/dashboard')}
            >
              Ir al dashboard
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer skip */}
      {step < 3 && (
        <button
          className="mt-6 text-slate-500 text-xs hover:text-slate-300 transition-colors"
          onClick={() => { markDone(); router.replace('/dashboard') }}
        >
          Saltar configuración e ir al dashboard →
        </button>
      )}
    </div>
  )
}
