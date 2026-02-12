'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  History,
  RefreshCw,
  Plus,
  ArrowRight,
  Edit,
  UserCog,
  Car,
  User,
  ClipboardCheck,
  PlusCircle,
  Edit2,
  MinusCircle,
  MessageSquare,
  Upload,
  Trash2,
  Trash,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarDays,
} from 'lucide-react'
import {
  type HistoryEntry,
  type HistoryAction,
  ACTION_CONFIG,
  STATUS_LABELS,
} from '@/lib/utils/work-order-history'

// Mapeo de iconos de Lucide por nombre
const ICON_MAP: Record<string, React.ElementType> = {
  Plus,
  ArrowRight,
  Edit,
  UserCog,
  Car,
  User,
  ClipboardCheck,
  PlusCircle,
  Edit2,
  MinusCircle,
  MessageSquare,
  Upload,
  Trash2,
  Trash,
}

interface WorkOrderHistoryProps {
  orderId: string
}

export function WorkOrderHistory({ orderId }: WorkOrderHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-orders/${orderId}/history`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al obtener historial')
      }

      const result = await response.json()

      if (result.success) {
        setHistory(result.data || [])
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar historial'
      setError(message)
      console.error('[WorkOrderHistory] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return 'Justo ahora'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`
    return formatDate(dateString)
  }

  // Agrupar entradas por fecha
  const groupedHistory = history.reduce<Record<string, HistoryEntry[]>>((groups, entry) => {
    const dateKey = formatDate(entry.created_at)
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(entry)
    return groups
  }, {})

  const getActionIcon = (action: HistoryAction) => {
    const config = ACTION_CONFIG[action]
    const IconComponent = ICON_MAP[config?.icon] || Edit
    return IconComponent
  }

  const getActionColor = (action: HistoryAction) => {
    return ACTION_CONFIG[action]?.color || 'text-slate-400'
  }

  const getActionBadgeVariant = (action: HistoryAction): string => {
    switch (action) {
      case 'created': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'status_change': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'assignment': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'field_update': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'vehicle_update': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'customer_update': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'inspection_update': return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      case 'item_added': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'item_updated': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'item_removed': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'note_added': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      case 'document_uploaded': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'document_deleted': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'deleted': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const renderChangeDetails = (entry: HistoryEntry) => {
    if (!entry.old_value && !entry.new_value) return null

    // Para cambios de estado, mostrar badge visual
    if (entry.action === 'status_change' && entry.old_value?.status && entry.new_value?.status) {
      const oldLabel = STATUS_LABELS[entry.old_value.status as string] || (entry.old_value.status as string)
      const newLabel = STATUS_LABELS[entry.new_value.status as string] || (entry.new_value.status as string)
      return (
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs bg-slate-800/50">
            {oldLabel}
          </Badge>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
            {newLabel}
          </Badge>
        </div>
      )
    }

    // Para otros cambios, mostrar old/new values como tabla
    if (entry.old_value || entry.new_value) {
      const allKeys = new Set([
        ...Object.keys(entry.old_value || {}),
        ...Object.keys(entry.new_value || {}),
      ])

      // No mostrar si solo hay claves internas
      if (allKeys.size === 0) return null

      const fieldLabels: Record<string, string> = {
        status: 'Estado',
        description: 'Descripción',
        estimated_cost: 'Costo Estimado',
        assigned_to: 'Asignado a',
        brand: 'Marca',
        model: 'Modelo',
        year: 'Año',
        license_plate: 'Placa',
        color: 'Color',
        mileage: 'Kilometraje',
        vin: 'VIN',
        name: 'Nombre',
        phone: 'Teléfono',
        email: 'Email',
        address: 'Dirección',
      }

      return (
        <div className="mt-2 text-xs space-y-1">
          {Array.from(allKeys).map(key => {
            const oldVal = entry.old_value?.[key]
            const newVal = entry.new_value?.[key]
            const label = fieldLabels[key] || key

            return (
              <div key={key} className="flex items-center gap-1 text-slate-400">
                <span className="font-medium text-slate-300">{label}:</span>
                {oldVal !== undefined && (
                  <span className="line-through text-slate-500">{String(oldVal || '—')}</span>
                )}
                {oldVal !== undefined && newVal !== undefined && (
                  <ArrowRight className="h-2.5 w-2.5 text-slate-600" />
                )}
                {newVal !== undefined && (
                  <span className="text-slate-200">{String(newVal || '—')}</span>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Cargando historial...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <History className="h-12 w-12 mb-4 text-red-400" />
        <p className="text-lg text-red-400">Error al cargar historial</p>
        <p className="text-sm mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchHistory}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Reintentar
        </Button>
      </div>
    )
  }

  // Empty state
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <History className="h-12 w-12 mb-4" />
        <p className="text-lg">Sin historial aún</p>
        <p className="text-sm mt-1">Los cambios realizados a esta orden se registrarán aquí.</p>
        <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualizar
        </Button>
      </div>
    )
  }

  // Timeline
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-200">
            Historial de Cambios
          </h3>
          <Badge variant="outline" className="text-xs">
            {history.length} {history.length === 1 ? 'registro' : 'registros'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Timeline agrupado por fecha */}
      <div className="space-y-6">
        {Object.entries(groupedHistory).map(([dateKey, entries]) => (
          <div key={dateKey}>
            {/* Separador de fecha */}
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {dateKey}
              </span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>

            {/* Entries del día */}
            <div className="relative ml-3">
              {/* Línea vertical del timeline */}
              <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />

              <div className="space-y-3">
                {entries.map((entry, idx) => {
                  const IconComponent = getActionIcon(entry.action as HistoryAction)
                  const iconColor = getActionColor(entry.action as HistoryAction)
                  const badgeClass = getActionBadgeVariant(entry.action as HistoryAction)
                  const isExpanded = expandedEntries.has(entry.id)
                  const hasDetails = entry.old_value || entry.new_value

                  return (
                    <div
                      key={entry.id}
                      className="relative flex gap-3 group"
                    >
                      {/* Dot del timeline */}
                      <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700 ${iconColor}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div 
                          className={`bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 ${hasDetails ? 'cursor-pointer hover:border-slate-600/50 transition-colors' : ''}`}
                          onClick={() => hasDetails && toggleExpanded(entry.id)}
                        >
                          {/* Header de la entrada */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] px-1.5 py-0 ${badgeClass}`}
                                >
                                  {ACTION_CONFIG[entry.action as HistoryAction]?.label || entry.action}
                                </Badge>
                                <span className="text-xs text-slate-500 font-medium">
                                  {entry.user_name}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300 mt-1 break-words">
                                {entry.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3 text-slate-600" />
                              <span className="text-[10px] text-slate-500" title={new Date(entry.created_at).toLocaleString('es-MX')}>
                                {formatTime(entry.created_at)}
                              </span>
                              {hasDetails && (
                                isExpanded 
                                  ? <ChevronUp className="h-3 w-3 text-slate-600 ml-1" />
                                  : <ChevronDown className="h-3 w-3 text-slate-600 ml-1" />
                              )}
                            </div>
                          </div>

                          {/* Detalles expandibles */}
                          {isExpanded && renderChangeDetails(entry)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
