/**
 * Dashboard individual del mecánico
 * Muestra estadísticas y órdenes asignadas
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Clock, CheckCircle, TrendingUp, Loader2, Calendar } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
import type { Employee } from '@/lib/database/queries/employees'

const STATUS_LABELS: Record<string, string> = {
  reception: 'Recepción',
  diagnosis: 'Diagnóstico',
  initial_quote: 'Cotización Inicial',
  waiting_approval: 'Esperando Aprobación',
  disassembly: 'Desarmado',
  waiting_parts: 'Esperando Piezas',
  assembly: 'Armado',
  testing: 'Pruebas',
  ready: 'Listo',
  completed: 'Completado',
  cancelled: 'Cancelado'
}

const STATUS_COLORS: Record<string, string> = {
  reception: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  diagnosis: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  initial_quote: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  waiting_approval: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  disassembly: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  waiting_parts: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  assembly: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  testing: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20'
}

export default function MechanicDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mechanicId = params.id as string

  const { getEmployee, getStats, getOrders } = useEmployees({ autoLoad: false })
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEmployeeData()
  }, [mechanicId])

  const loadEmployeeData = async () => {
    if (!mechanicId) return

    try {
      setLoading(true)
      setError(null)

      // Cargar datos en paralelo
      const [empData, statsData, ordersData] = await Promise.all([
        getEmployee(mechanicId),
        getStats(mechanicId),
        getOrders(mechanicId)
      ])

      setEmployee(empData)
      setStats(statsData)
      setOrders(ordersData || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos del mecánico')
      console.error('Error loading mechanic data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Mecánico no encontrado'}</p>
          <button
            onClick={() => router.push('/mecanicos')}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Volver a Mecánicos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/mecanicos')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mecánicos
        </button>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {employee.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="capitalize">{employee.role}</span>
                  {employee.email && (
                    <>
                      <span>•</span>
                      <span>{employee.email}</span>
                    </>
                  )}
                  {employee.phone && (
                    <>
                      <span>•</span>
                      <span>{employee.phone}</span>
                    </>
                  )}
                </div>
                {employee.specialties && employee.specialties.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {employee.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              employee.is_active
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {employee.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats?.total_orders || 0}
          </p>
          <p className="text-sm text-gray-400">Órdenes Totales</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats?.in_progress_orders || 0}
          </p>
          <p className="text-sm text-gray-400">En Proceso</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats?.completed_orders || 0}
          </p>
          <p className="text-sm text-gray-400">Completadas</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats?.efficiency_rate || 0}%
          </p>
          <p className="text-sm text-gray-400">Eficiencia</p>
          {stats?.avg_completion_time && (
            <p className="text-xs text-gray-500 mt-1">
              ~{Math.round(stats.avg_completion_time)} días promedio
            </p>
          )}
        </div>
      </div>

      {/* Órdenes Asignadas */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Órdenes Asignadas ({orders.length})
          </h2>
        </div>

        <div className="p-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No hay órdenes asignadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/ordenes/${order.id}`)}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {order.customer?.name || 'Sin cliente'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {order.vehicle?.brand} {order.vehicle?.model} {order.vehicle?.year}
                        {order.vehicle?.license_plate && ` • ${order.vehicle.license_plate}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      STATUS_COLORS[order.status] || 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  
                  {order.description && (
                    <p className="text-sm text-gray-400 mb-3">
                      {order.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(order.entry_date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {order.total_amount > 0 && (
                      <span className="text-cyan-400 font-medium">
                        ${order.total_amount.toLocaleString('es-MX')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
