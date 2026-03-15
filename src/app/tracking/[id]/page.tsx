'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MessageCircle, Clock, CheckCircle2, AlertCircle, Wrench, Search, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ✅ Estados oficiales según BD (Mapeo para el Stepper del Cliente)
const TRACKING_STEPS = [
  { id: 'reception', label: 'Recepción', icon: Search, color: 'text-gray-400' },
  { id: 'diagnosis', label: 'Diagnóstico', icon: AlertCircle, color: 'text-purple-400' },
  { id: 'in_repair', label: 'Reparación', icon: Wrench, color: 'text-blue-400' },
  { id: 'testing', label: 'Pruebas', icon: Clock, color: 'text-cyan-400' },
  { id: 'ready', label: 'Listo para entrega', icon: CheckCircle2, color: 'text-green-400' }
]

const STATUS_MAP: Record<string, string> = {
  'reception': 'reception',
  'pending': 'reception',
  'diagnosis': 'diagnosis',
  'diagnosed': 'diagnosis',
  'initial_quote': 'diagnosis',
  'waiting_approval': 'diagnosis',
  'disassembly': 'in_repair',
  'in_repair': 'in_repair',
  'waiting_parts': 'in_repair',
  'assembly': 'in_repair',
  'testing': 'testing',
  'ready': 'ready',
  'completed': 'ready',
  'delivered': 'ready'
}

export default function TrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = async () => {
    try {
      const resp = await fetch(`/api/public/orders/${id}`)
      const data = await resp.json()
      if (data.success) {
        setOrder(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    // Polling cada 60 segundos
    const interval = setInterval(fetchOrder, 60000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse font-medium">Cargando estado de tu vehículo...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">¡Ups! Algo salió mal</h1>
        <p className="text-slate-400 mb-8 max-w-md">{error || 'No pudimos encontrar la información de tu orden.'}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="border-slate-800">
          Reintentar
        </Button>
      </div>
    )
  }

  const currentStepId = STATUS_MAP[order.status] || 'reception'
  const currentStepIndex = TRACKING_STEPS.findIndex(s => s.id === currentStepId)

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado en Vivo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            EAGLES SYSTEM
          </h1>
          <p className="text-slate-400 text-sm">Seguimiento de Orden #{order.order_number || id?.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Vehicle Status Card */}
        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-md mb-8 overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-slate-800/60 bg-slate-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Car className="text-primary w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{order.vehicle?.brand} {order.vehicle?.model}</CardTitle>
                  <p className="text-xs text-slate-500">{order.vehicle?.year} • {order.vehicle?.color}</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 capitalize font-bold">
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-8 px-4 sm:px-8">
            {/* Stepper */}
            <div className="relative">
              {/* Line Background */}
              <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-slate-800 md:left-0 md:right-0 md:top-[19px] md:bottom-auto md:w-full md:h-[2px]" />
              
              {/* Line Progress */}
              <div 
                className="absolute left-[19px] top-0 w-[2px] bg-primary transition-all duration-1000 md:left-0 md:top-[19px] md:h-[2px]"
                style={{ 
                  height: typeof window !== 'undefined' && window.innerWidth < 768 ? `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%` : 'auto',
                  width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%` : '2px'
                }}
              />

              <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-2">
                {TRACKING_STEPS.map((step, index) => {
                  const isCompleted = index < currentStepIndex
                  const isCurrent = index === currentStepIndex
                  const Icon = step.icon

                  return (
                    <div key={step.id} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10
                        ${isCompleted ? 'bg-primary border-primary text-slate-950' : 
                          isCurrent ? 'bg-slate-950 border-primary text-primary shadow-[0_0_15px_rgba(0,217,255,0.4)]' : 
                          'bg-slate-950 border-slate-800 text-slate-600'}
                      `}>
                        {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                      </div>
                      <div className="text-left md:text-center">
                        <p className={`text-xs font-bold uppercase tracking-tighter ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] text-primary/70 animate-pulse hidden md:block">En proceso</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History / Description Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historial del Servicio
          </h2>
          
          <div className="space-y-4">
            {order.notes && order.notes.length > 0 ? (
              order.notes.map((note: any) => (
                <Card key={note.id} className="bg-slate-900/30 border-slate-800/40 hover:bg-slate-900/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300 border-none uppercase tracking-widest">
                        {note.category}
                      </Badge>
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(note.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{note.text}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-500 text-sm">Pronto verás aquí los avances de tu reparación.</p>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Support Button */}
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-slow">
          <a 
            href={`https://wa.me/?text=${encodeURIComponent(`Hola, soy ${order.customer_name}, consulto por mi orden #${order.order_number || id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all transform hover:scale-110 active:scale-95 group"
          >
            <MessageCircle className="w-6 h-6 fill-current" />
            <span className="font-bold tracking-tight">Contactar Soporte</span>
          </a>
        </div>

        <footer className="mt-20 py-8 border-t border-slate-900 text-center space-y-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">Powered by Eagles System ERP</p>
          <p className="text-slate-700 text-[9px]">© 2024 Todos los derechos reservados.</p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}
