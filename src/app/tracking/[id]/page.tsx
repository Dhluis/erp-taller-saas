'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, MessageCircle, Clock, CheckCircle2, AlertCircle, Wrench, Search, Car, 
  History, User, ShieldCheck, Camera, MapPin, Gauge, Calendar, Info,
  FileText, PackageSearch, Settings, Activity, CheckCheck, Fuel, Droplets,
  Package, DollarSign, ClipboardList, Stethoscope, Phone, Mail, Building2, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ✅ Hitos Públicos (Milestones) - Mapeados desde Kanban real
const PUBLIC_MILESTONES = [
  { id: 'reception', label: 'RECEPCIÓN', icon: Search, desc: 'Vehículo recibido en taller' },
  { id: 'diagnosis', label: 'DIAGNÓSTICO', icon: AlertCircle, desc: 'Inspección y diagnóstico de fallas' },
  { id: 'initial_quote', label: 'COTIZACIÓN', icon: FileText, desc: 'Generando presupuesto inicial' },
  { id: 'waiting_approval', label: 'APROBACIÓN', icon: Clock, desc: 'Esperando aprobación del cliente' },
  { id: 'disassembly', label: 'DESARMADO', icon: Wrench, desc: 'Desarmado de componentes' },
  { id: 'waiting_parts', label: 'REFACCIONES', icon: PackageSearch, desc: 'Esperando piezas' },
  { id: 'assembly', label: 'ARMADO', icon: Settings, desc: 'Armado de componentes' },
  { id: 'testing', label: 'PRUEBAS', icon: Activity, desc: 'Pruebas de calidad' },
  { id: 'ready', label: 'LISTO', icon: CheckCircle2, desc: 'Listo para entrega' },
  { id: 'completed', label: 'ENTREGADO', icon: CheckCheck, desc: 'Vehículo entregado al cliente' }
]

const FUEL_LABELS: Record<string, string> = {
  empty: 'Vacío (0/4)',
  quarter: '1/4',
  half: '½ Tanque',
  three_quarters: '3/4',
  full: 'Lleno',
}

const FUEL_PERCENT: Record<string, number> = {
  empty: 0,
  quarter: 25,
  half: 50,
  three_quarters: 75,
  full: 100,
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  service: 'Servicio',
  part: 'Refacción',
  labor: 'Mano de obra',
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount)
}

export default function TrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = async () => {
    try {
      const resp = await fetch(`/api/public/orders/${id}`, { cache: 'no-store' })
      const data = await resp.json()
      if (data.success) {
        setOrder(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Error al recibir datos del servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 60000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Car className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-slate-400 font-medium tracking-widest text-xs uppercase animate-pulse">Sincronizando con el taller...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-3xl mb-8 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Información no encontrada</h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          No pudimos localizar la orden de trabajo especificada. Verifica el enlace o contacta con el taller.
        </p>
        <Button onClick={() => window.location.reload()} size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20">
          Reintentar conexión
        </Button>
      </div>
    )
  }

  let currentMilestoneIndex = PUBLIC_MILESTONES.findIndex(m => m.id === order.milestone)
  if (currentMilestoneIndex === -1 && (order.status === 'archived' || order.status === 'completed')) {
    currentMilestoneIndex = PUBLIC_MILESTONES.length - 1;
  } else if (currentMilestoneIndex === -1) {
    currentMilestoneIndex = 0;
  }

  const hasFinancial = order.financial && (order.financial.total_amount || order.financial.subtotal || order.financial.estimated_cost)
  const hasItems = order.order_items && order.order_items.length > 0
  const hasInspection = !!order.inspection
  const hasDiagnosis = !!order.diagnosis

  // Helper para asegurar que las URLs sean absolutas (especialmente para Supabase Storage)
  const ensureAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    
    // Si es un path relativo de Supabase Storage, construir la URL completa
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igshgleciwknpupbmvhn.supabase.co';
    // Asumimos que los archivos están en el bucket 'company-assets' o 'images'
    const bucket = url.includes('terms') ? 'company-assets' : 'images';
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${url}`;
  };

  const workshopLogoUrl = ensureAbsoluteUrl(order.company?.logo_url);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-primary/30 selection:text-white pb-24">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen opacity-30" />
      </div>

      {/* Nav Superior */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              {workshopLogoUrl ? (
                <img src={workshopLogoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Car className="text-white w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] md:max-w-xs">{order.company?.company_name || 'TALLER MECÁNICO'}</h2>
              <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mt-1">{order.company?.company_name ? 'SISTEMA DE SEGUIMIENTO' : 'GESTIÓN DE TALLER'}</p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="rounded-full border-white/10 hover:bg-white/5 hidden sm:flex">
            <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
            Acceso Seguro
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
        {/* Encabezado de Página */}
        <section className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              PROGRESO EN TIEMPO REAL
            </h1>
            <p className="text-slate-400 font-medium">Información actualizada en tiempo real de tu servicio.</p>
          </div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Seguimiento en vivo</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">#{order.order_number || (typeof id === 'string' ? id : id?.[0] || '').slice(0, 8).toUpperCase()}</p>
          </div>
        </section>

        {/* ✅ Stepper Principal Premium - SIN CAMBIOS */}
        <Card className="bg-slate-900/40 border-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-[2rem]">
          <CardContent className="p-8 sm:p-12">
            <div className="w-full overflow-x-auto hide-scrollbar pb-6">
              <div className="min-w-[800px] relative pt-12 pb-8 px-4">
                <div className="absolute left-8 right-8 top-[4.25rem] h-1.5 bg-white/5 rounded-full" />
                <div 
                  className="absolute left-8 top-[4.25rem] h-1.5 bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,217,255,0.4)]"
                  style={{ width: `calc(${(currentMilestoneIndex / (PUBLIC_MILESTONES.length - 1)) * 100}%)` }}
                />

                <div className="relative flex justify-between gap-2">
                  {PUBLIC_MILESTONES.map((milestone, index) => {
                    const isCompleted = index < currentMilestoneIndex
                    const isCurrent = index === currentMilestoneIndex
                    const Icon = milestone.icon

                    return (
                      <div key={milestone.id} className="flex flex-col items-center gap-4 group w-20">
                        <div className={`
                          relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 z-10 border-4
                          ${isCompleted ? 'bg-primary border-slate-900 text-slate-950 scale-110' : 
                            isCurrent ? 'bg-slate-950 border-primary text-primary shadow-[0_0_30px_rgba(0,217,255,0.3)] scale-125' : 
                            'bg-slate-950 border-white/5 text-slate-600'}
                        `}>
                          {isCompleted ? <CheckCircle2 size={24} className="stroke-[3]" /> : <Icon size={24} />}
                          <div className="absolute inset-[-10px] bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        
                        <div className="text-center space-y-1.5 mt-2">
                          <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-slate-500'} break-words leading-tight`}>
                            {milestone.label}
                          </p>
                          <div className="flex flex-col items-center pt-1">
                            <span className={`text-[9px] font-bold ${isCurrent ? 'text-primary/80' : 'text-slate-600'}`}>
                              {isCompleted ? 'Completado' : isCurrent ? 'En Proceso' : 'Pendiente'}
                            </span>
                            <span className="text-[8px] text-slate-700 font-medium whitespace-nowrap">
                              {isCompleted ? format(new Date(order.created_at), 'MMM d', { locale: es }) : 
                               isCurrent ? format(new Date(order.updated_at), 'MMM d', { locale: es }) : '-- --'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Grid de Información - Vehículo + Historial (SIN CAMBIOS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tarjeta de Vehículo */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-black text-white px-2 tracking-tight flex items-center gap-3">
              RESUMEN DEL VEHÍCULO
              <span className="h-px bg-white/10 flex-1" />
            </h3>
            
            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md overflow-hidden rounded-[2rem] hover:border-primary/20 transition-all group">
              <CardContent className="p-0 flex flex-col sm:flex-row">
                <div className="w-full sm:w-[40%] h-64 sm:h-auto overflow-hidden bg-slate-950/50 flex items-center justify-center relative border-r border-white/5">
                  {order.images?.[0]?.url ? (
                    <img 
                      src={order.images[0].url} 
                      alt="Vehículo"
                      className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Car size={64} className="text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">Sin imagen</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md mb-2">Reparación Activa</Badge>
                  </div>
                </div>
                
                <div className="flex-1 p-8 space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-white uppercase">{order.vehicle?.make || order.vehicle?.brand} {order.vehicle?.model}</h4>
                    <p className="text-slate-400 font-medium">VIN: {order.vehicle?.vin || 'Aún no capturado'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Placas</p>
                      <p className="text-white font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {order.vehicle?.license_plate || 'NO REGISTRADA'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Propietario</p>
                      <p className="text-white font-bold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        {order.customer_name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Kilometraje</p>
                      <p className="text-white font-bold flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        {order.vehicle?.mileage?.toLocaleString() || 'No registrado'} km
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Estado</p>
                      <p className="text-primary font-black uppercase tracking-tight flex items-center gap-2 italic">
                        <Loader2 className="w-4 h-4 animate-spin-slow" />
                        {order.status.replace('_', ' ')}
                      </p>
                    </div>
                    {order.entry_date && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Ingreso</p>
                        <p className="text-white font-bold flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          {format(new Date(order.entry_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                    {order.estimated_completion && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Entrega Est.</p>
                        <p className="text-white font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-400" />
                          {format(new Date(order.estimated_completion), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-500">Actualizado recientemente</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,217,255,0.6)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Log - SIN CAMBIOS */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white px-2 tracking-tight flex items-center gap-3">
              HISTORIAL DE ESTADO
              <span className="h-px bg-white/10 flex-1" />
            </h3>
            
            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md rounded-[2rem] h-full">
              <CardContent className="p-6 space-y-6">
                {order.notes && order.notes.length > 0 ? (
                  order.notes.slice(0, 5).map((note: any, i: number) => (
                    <div key={note.id} className="flex gap-4 relative">
                      {i !== Math.min(order.notes.length, 5) - 1 && <div className="absolute left-[7px] top-4 bottom-[-24px] w-px bg-white/10" />}
                      <div className={`w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 z-10 ${i === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-800'}`} />
                      <div className="space-y-1">
                        <p className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-slate-400'}`}>{note.text}</p>
                        <p className="text-[10px] font-medium text-slate-600">
                          {format(new Date(note.createdAt || note.created_at), 'MMM d, HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-3 opacity-50">
                    <History className="w-8 h-8 text-slate-700" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Sin actividad registrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ✅ NUEVO: Inspección de Entrada */}
        {hasInspection && (
          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Fuel className="w-6 h-6 text-primary" />
              INSPECCIÓN DE ENTRADA
              <span className="h-px bg-white/10 flex-1" />
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nivel de Combustible */}
              <Card className="bg-slate-900/40 border-white/5 rounded-[2rem] col-span-1">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="w-5 h-5 text-amber-400" />
                    <h4 className="font-black text-white uppercase text-sm tracking-wider">Nivel de Combustible</h4>
                  </div>
                  {/* Visual fuel gauge */}
                  <div className="relative">
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${FUEL_PERCENT[order.inspection.fuel_level] ?? 50}%`,
                          background: `linear-gradient(90deg, #f59e0b, #fbbf24)`
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-600 font-bold">
                      <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                    </div>
                  </div>
                  <p className="text-amber-400 font-black text-lg">{FUEL_LABELS[order.inspection.fuel_level] || order.inspection.fuel_level || '—'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Al momento de ingreso al taller</p>
                </CardContent>
              </Card>

              {/* Check de Fluidos */}
              <Card className="bg-slate-900/40 border-white/5 rounded-[2rem]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <h4 className="font-black text-white uppercase text-sm tracking-wider">Fluidos</h4>
                  </div>
                  <div className="space-y-3">
                    {order.inspection.fluids_check && typeof order.inspection.fluids_check === 'object'
                      ? Object.entries(order.inspection.fluids_check).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {value ? 'OK' : 'Revisar'}
                            </span>
                          </div>
                        ))
                      : <p className="text-slate-500 text-sm">
                          {order.inspection.fluids_check ? '✓ Revisados' : 'No registrado'}
                        </p>
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Objetos de Valor / Información adicional */}
              <Card className="bg-slate-900/40 border-white/5 rounded-[2rem]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-5 h-5 text-purple-400" />
                    <h4 className="font-black text-white uppercase text-sm tracking-wider">Detalles Adicionales</h4>
                  </div>
                  <div className="space-y-3">
                    {order.inspection.valuable_items != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Objetos de valor declarados</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.inspection.valuable_items ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>
                          {order.inspection.valuable_items ? 'Sí' : 'No'}
                        </span>
                      </div>
                    )}
                    {order.inspection.authorize_test_drive != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Prueba de manejo autorizada</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.inspection.authorize_test_drive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                          {order.inspection.authorize_test_drive ? 'Sí' : 'No'}
                        </span>
                      </div>
                    )}
                    {order.inspection.will_diagnose != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Diagnóstico solicitado</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.inspection.will_diagnose ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}`}>
                          {order.inspection.will_diagnose ? 'Sí' : 'No'}
                        </span>
                      </div>
                    )}
                    {order.inspection.entry_reason && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Motivo de ingreso</p>
                        <p className="text-sm text-slate-300">{order.inspection.entry_reason}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* ✅ NUEVO: Diagnóstico del Técnico */}
        {hasDiagnosis && (
          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Stethoscope className="w-6 h-6 text-primary" />
              DIAGNÓSTICO DEL TÉCNICO
              <span className="h-px bg-white/10 flex-1" />
            </h3>
            <Card className="bg-primary/5 border border-primary/10 rounded-[2rem]">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    {order.assigned_to ? (
                      <span className="text-primary font-black text-lg">{order.assigned_to.charAt(0).toUpperCase()}</span>
                    ) : (
                      <User className="w-6 h-6 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-primary uppercase tracking-wider mb-1">{order.assigned_to || 'Técnico Asignado'}</p>
                    <p className="text-slate-300 leading-relaxed font-serif italic text-base">"{order.diagnosis}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ✅ NUEVO: Cotización / Servicios */}
        {(hasItems || hasFinancial) && (
          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              COTIZACIÓN DE SERVICIOS
              <span className="h-px bg-white/10 flex-1" />
            </h3>

            <Card className="bg-slate-900/40 border-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden">
              <CardContent className="p-0">
                {hasItems ? (
                  <>
                    {/* Header de la tabla */}
                    <div className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                      <div className="col-span-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Concepto</div>
                      <div className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Tipo</div>
                      <div className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</div>
                      <div className="col-span-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total</div>
                    </div>

                    {/* Items */}
                    {order.order_items.map((item: any, i: number) => (
                      <div key={item.id} className={`grid grid-cols-12 gap-2 px-6 py-4 items-center ${i % 2 === 1 ? 'bg-white/[0.02]' : ''} border-b border-white/5 last:border-0`}>
                        <div className="col-span-5 space-y-0.5">
                          <p className="text-white font-bold text-sm">{item.item_name}</p>
                          {item.description && <p className="text-slate-500 text-xs">{item.description}</p>}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.item_type === 'service' ? 'bg-primary/20 text-primary' :
                            item.item_type === 'part' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {ITEM_TYPE_LABELS[item.item_type] || item.item_type}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-slate-300 text-sm font-bold">{item.quantity}</span>
                          {item.unit_price != null && (
                            <p className="text-[10px] text-slate-600">{formatCurrency(item.unit_price)} c/u</p>
                          )}
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-white font-black">{formatCurrency(item.total_price)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}

                {/* Totales */}
                {hasFinancial && (
                  <div className="px-6 py-6 bg-white/[0.03] border-t border-white/10 space-y-3">
                    {order.financial.subtotal != null && order.financial.subtotal !== order.financial.total_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-white font-bold">{formatCurrency(order.financial.subtotal)}</span>
                      </div>
                    )}
                    {order.financial.tax_amount != null && order.financial.tax_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">IVA</span>
                        <span className="text-white font-bold">{formatCurrency(order.financial.tax_amount)}</span>
                      </div>
                    )}
                    {order.financial.discount_amount != null && order.financial.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Descuento</span>
                        <span className="text-green-400 font-bold">-{formatCurrency(order.financial.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <span className="text-white font-black text-lg uppercase tracking-wide flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        TOTAL
                      </span>
                      <span className="text-2xl font-black text-primary">
                        {formatCurrency(order.financial.total_amount || order.financial.estimated_cost)}
                      </span>
                    </div>
                    {order.financial.total_amount == null && order.financial.estimated_cost != null && (
                      <p className="text-[10px] text-slate-600 text-right italic">*Costo estimado, sujeto a cambios</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ✅ Sección descripción del servicio (MEJORADA con datos reales) */}
        <section className="bg-primary/5 rounded-[2.5rem] border border-primary/10 p-8 sm:p-12 relative overflow-hidden group">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <Badge className="bg-primary/20 text-primary border-primary/30">Resumen del Servicio</Badge>
                <h3 className="text-3xl font-black text-white tracking-tight leading-tight uppercase">
                  Nuestros técnicos están trabajando en tu vehículo con las mejores herramientas.
                </h3>
              </div>
              <p className="text-slate-400 leading-relaxed font-medium">
                Esta es la descripción oficial de tu orden. Ante cualquier duda, puedes contactar con nuestro equipo de soporte técnico instantáneamente via WhatsApp.
              </p>
              
              {/* TÉRMINOS Y CONDICIONES */}
              {(order.terms_text || order.terms_file_url || (order.company && (order.company.terms_text || order.company.terms_pdf_url))) && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Términos y Condiciones</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    { (order.terms_text || order.company?.terms_text) ? (
                      <p className="text-[11px] text-slate-400 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                        {order.terms_text || order.company?.terms_text}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Consulta los términos y condiciones del servicio.</p>
                    )}
                    
                    {(order.terms_file_url || order.company?.terms_pdf_url) && (
                      <a 
                        href={ensureAbsoluteUrl(order.terms_file_url || order.company?.terms_pdf_url) || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-2 text-xs font-bold text-primary hover:text-white transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        VER DOCUMENTO COMPLETO (PDF)
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* FIRMA DEL CLIENTE */}
              {(order.customer_signature || order.terms_accepted) && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Aprobación del Cliente</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
                    {order.customer_signature ? (
                      <div className="bg-white p-2 rounded-lg max-w-[200px]">
                        <img src={order.customer_signature} alt="Firma del Cliente" className="max-h-24 object-contain" />
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Aprobado Digitalmente</Badge>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">
                      Confirmado por {order.customer_name} 
                      {order.terms_accepted_at && ` - ${format(new Date(order.terms_accepted_at), 'dd/MM/yyyy HH:mm', { locale: es })}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-4">
                <div className="px-5 py-3 bg-slate-950 rounded-2xl flex items-center gap-3 border border-white/5">
                  <Info className="w-5 h-5 text-primary" />
                  <span className="text-xs font-bold text-white uppercase">{order.status.replace('_', ' ')}</span>
                </div>
                <div className="px-5 py-3 bg-slate-950 rounded-2xl flex items-center gap-3 border border-white/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-tight">Garantía Activa</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-2xl">
              <div className="space-y-4">
                <h4 className="text-sm font-black tracking-widest text-slate-500 uppercase">Descripción del Servicio</h4>
                <p className="text-slate-300 italic font-serif leading-relaxed">
                  "{order.description || 'Estamos realizando una revisión general exhaustiva de los sistemas de seguridad y motor de su vehículo.'}"
                </p>
              </div>
              
              <div className="pt-6 border-t border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 bg-slate-800 flex items-center justify-center">
                  {order.assigned_to ? (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {order.assigned_to.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <User className="text-slate-600 w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white">{order.assigned_to || 'Técnico Asignado'}</p>
                  <p className="text-xs text-slate-500 font-medium tracking-tight whitespace-nowrap">Especialista en Diagnóstico</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ✅ Galería de Reparación - SIN CAMBIOS */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              GALERÍA DE FOTOS
              <span className="h-px bg-white/10 flex-1" />
            </h3>
            <p className="text-slate-400 text-sm font-medium">Fotos actuales de tu vehículo siendo atendido.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {order.images && order.images.length > 0 ? order.images.map((img: any, i: number) => (
              <Card key={i} className="group overflow-hidden border-white/5 bg-slate-900/40 backdrop-blur-md rounded-3xl hover:border-primary/30 transition-all cursor-zoom-in">
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={img.url} 
                    alt={img.description || img.caption || 'Car Repair'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                    <p className="text-[10px] font-black text-white uppercase mb-1">{img.category || 'Taller'}</p>
                    <p className="text-[8px] font-medium text-slate-400">{img.uploadedAt ? format(new Date(img.uploadedAt), 'MMM d, yyyy', { locale: es }) : 'Reciente'}</p>
                  </div>
                </div>
              </Card>
            )) : (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="aspect-video rounded-[2rem] bg-slate-900/40 border border-white/5 flex flex-col items-center justify-center p-8 text-center gap-3 opacity-50 border-dashed">
                  <Camera className="w-8 h-8 text-slate-700" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aún sin fotos de esta etapa</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ✅ NUEVO: Información de Contacto del Taller */}
        {(order.company?.phone || order.company?.email || order.company?.address) && (
          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              CONTACTO DEL TALLER
              <span className="h-px bg-white/10 flex-1" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {order.company?.phone && (
                <a href={`tel:${order.company.phone}`} className="group">
                  <Card className="bg-slate-900/40 border-white/5 rounded-2xl hover:border-primary/30 transition-all">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Teléfono</p>
                        <p className="text-white font-bold group-hover:text-primary transition-colors">{order.company.phone}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </a>
              )}
              {order.company?.email && (
                <a href={`mailto:${order.company.email}`} className="group">
                  <Card className="bg-slate-900/40 border-white/5 rounded-2xl hover:border-primary/30 transition-all">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Email</p>
                        <p className="text-white font-bold group-hover:text-primary transition-colors text-sm">{order.company.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </a>
              )}
              {order.company?.address && (
                <Card className="bg-slate-900/40 border-white/5 rounded-2xl">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Dirección</p>
                      <p className="text-white font-bold text-sm">{order.company.address}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Footer info */}
        <footer className="pt-12 text-center space-y-4">
          <div className="h-px w-24 bg-primary mx-auto opacity-30 shadow-[0_0_8px_rgba(0,217,255,0.6)]" />
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black">{order.company?.company_name || 'SISTEMA DE GESTIÓN MECÁNICA'}</p>
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-700">
            <a href="#" className="hover:text-primary transition-colors">POLÍTICA DE PRIVACIDAD</a>
            <a href="#" className="hover:text-primary transition-colors">TÉRMINOS DE SERVICIO</a>
            <a href="#" className="hover:text-primary transition-colors">SOPORTE</a>
          </div>
        </footer>
      </main>

      {/* Botón WhatsApp Flotante */}
      <div className="fixed bottom-8 right-8 z-[100] group">
        <div className="absolute inset-[-4px] bg-[#25D366] rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
        <a 
          href={`https://wa.me/${order.company?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(`Hola, soy ${order.customer_name}, consulto por mi orden #${order.order_number || id}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block bg-[#25D366] text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all duration-300 group"
        >
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/5 px-4 py-2 rounded-2xl opacity-0 translate-x-10 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap pointer-events-none">
            <p className="text-xs font-black text-white uppercase tracking-wider">Chatear con nosotros</p>
          </div>
          <MessageCircle className="w-7 h-7 fill-white" />
        </a>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;500;700;900&display=swap');
      `}</style>
    </div>
  )
}
