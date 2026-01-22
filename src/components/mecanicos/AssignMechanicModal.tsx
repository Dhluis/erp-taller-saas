/**
 * Modal para asignar o reasignar mecánico a una orden de trabajo
 */

'use client'

import { useState, useEffect } from 'react'
import { X, User, Search, Loader2 } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
import { useSession } from '@/lib/context/SessionContext'
import { toast } from 'sonner'

interface AssignMechanicModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  currentMechanicId?: string | null
  onSuccess?: () => void
}

interface MechanicUser {
  id: string
  full_name: string
  email: string | null
  role: string
}

export default function AssignMechanicModal({
  isOpen,
  onClose,
  orderId,
  currentMechanicId,
  onSuccess
}: AssignMechanicModalProps) {
  const { profile } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(
    currentMechanicId || null
  )
  const [mechanics, setMechanics] = useState<MechanicUser[]>([])
  const [loadingMechanics, setLoadingMechanics] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  
  const { assignOrder } = useEmployees({ autoLoad: false })

  // ✅ Validar permisos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const canReassignOrders = profile?.role === 'ADMIN' || profile?.role === 'ASESOR'
      
      if (!canReassignOrders) {
        toast.error('No tienes permisos para reasignar órdenes', {
          description: 'Solo administradores y asesores pueden reasignar órdenes de trabajo.',
          duration: 4000
        })
        onClose()
        return
      }
    }
  }, [isOpen, profile?.role, onClose])

  // Cargar usuarios con rol MECANICO
  useEffect(() => {
    if (!isOpen) return

    console.log('🔄 [AssignMechanicModal] Modal abierto, cargando mecánicos...')
    console.log('  orderId:', orderId)
    console.log('  currentMechanicId:', currentMechanicId)
    console.log('  currentMechanicIdType:', typeof currentMechanicId)
    console.log('  isOpen:', isOpen)

    const loadMechanics = async () => {
      setLoadingMechanics(true)
      try {
        const response = await fetch('/api/users', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Error al cargar mecánicos')
        }
        
        const data = await response.json()
        const allUsers = data.users || []
        
        // Filtrar solo usuarios con rol MECANICO
        const mechanicUsers = allUsers.filter((user: any) => 
          user.role === 'MECANICO' && user.is_active !== false
        )
        
        console.log('✅ [AssignMechanicModal] Mecánicos cargados:')
        console.log('  Total:', mechanicUsers.length)
        console.log('  currentMechanicId:', currentMechanicId)
        console.log('  currentMechanicIdType:', typeof currentMechanicId)
        console.log('  Mecánicos:', mechanicUsers.map((m: any) => ({ 
          id: m.id, 
          name: m.full_name,
          matchesCurrent: m.id === currentMechanicId
        })))
        
        // 🔍 DIAGNÓSTICO: Verificar si currentMechanicId coincide con algún mecánico
        if (currentMechanicId) {
          const foundMechanic = mechanicUsers.find((m: any) => m.id === currentMechanicId)
          console.log('🔍 [DIAGNÓSTICO] Mecánico actual encontrado en lista:', foundMechanic ? 'SÍ' : 'NO')
          if (foundMechanic) {
            console.log('  ✅ Mecánico encontrado:', { 
              id: foundMechanic.id, 
              name: foundMechanic.full_name,
              auth_user_id: foundMechanic.auth_user_id 
            })
          } else {
            console.log('  ⚠️ PROBLEMA: currentMechanicId no coincide con ningún mecánico en la lista')
            console.log('  currentMechanicId recibido:', currentMechanicId)
            console.log('  Tipo de currentMechanicId:', typeof currentMechanicId)
            console.log('  IDs de mecánicos disponibles:')
            mechanicUsers.forEach((m: any, index: number) => {
              console.log(`    [${index}] id: ${m.id}, name: ${m.full_name}, auth_user_id: ${m.auth_user_id}`)
              console.log(`        ¿Coincide con currentMechanicId? ${m.id === currentMechanicId}`)
              console.log(`        ¿auth_user_id coincide? ${m.auth_user_id === currentMechanicId}`)
            })
            
            // 🔍 INTENTAR BUSCAR POR auth_user_id también
            const foundByAuthId = mechanicUsers.find((m: any) => m.auth_user_id === currentMechanicId)
            if (foundByAuthId) {
              console.log('  ⚠️ PROBLEMA DETECTADO: currentMechanicId es un auth_user_id, no users.id!')
              console.log('  Mecánico encontrado por auth_user_id:', {
                id: foundByAuthId.id,
                auth_user_id: foundByAuthId.auth_user_id,
                name: foundByAuthId.full_name
              })
              console.log('  💡 SOLUCIÓN: El componente padre debe pasar users.id, no auth_user_id')
            }
          }
        } else {
          console.log('🔍 [DIAGNÓSTICO] No hay currentMechanicId (orden sin asignar)')
        }
        
        setMechanics(mechanicUsers)
      } catch (error: any) {
        console.error('Error cargando mecánicos:', error)
        toast.error('Error', {
          description: error.message || 'No se pudieron cargar los mecánicos'
        })
      } finally {
        setLoadingMechanics(false)
      }
    }

    loadMechanics()
  }, [isOpen, currentMechanicId, orderId])

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  // Actualizar selección cuando cambia el mecánico actual
  useEffect(() => {
    setSelectedMechanicId(currentMechanicId || null)
  }, [currentMechanicId])

  // Filtrar mecánicos por búsqueda
  const filteredMechanics = mechanics.filter(m =>
    (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssign = async () => {
    // ✅ Doble validación de permisos (por si acaso)
    const canReassignOrders = profile?.role === 'ADMIN' || profile?.role === 'ASESOR'
    
    if (!canReassignOrders) {
      toast.error('Acción no permitida', {
        description: 'No tienes permisos para reasignar órdenes de trabajo.',
        duration: 4000
      })
      onClose()
      return
    }

    console.log('🚀 [AssignMechanicModal] handleAssign llamado')
    console.log('  selectedMechanicId:', selectedMechanicId)
    console.log('  currentMechanicId:', currentMechanicId)
    console.log('  Son iguales:', selectedMechanicId === currentMechanicId)
    
    if (!selectedMechanicId) {
      console.log('  ❌ No hay mecánico seleccionado')
      toast.error('Por favor selecciona un mecánico')
      return
    }

    if (selectedMechanicId === currentMechanicId) {
      console.log('  ⚠️ Mecánico seleccionado es el mismo que el actual')
      toast.info('Este mecánico ya está asignado a la orden')
      return
    }
    
    console.log('  ✅ Procediendo con asignación...')

    setIsAssigning(true)
    
    try {
      console.log('🔄 [AssignMechanicModal] Asignando orden:', {
        orderId,
        selectedMechanicId,
        currentMechanicId
      })

      // ✅ FIX: Usar directamente el id (que es el id de la tabla users)
      // El backend espera assigned_to como FK a users.id
      const success = await assignOrder(orderId, selectedMechanicId)
      
      console.log('✅ [AssignMechanicModal] Resultado de asignación:', success)
      
      if (success) {
        console.log('✅ [AssignMechanicModal] Llamando onSuccess y cerrando modal')
        onSuccess?.()
        onClose()
      } else {
        console.error('❌ [AssignMechanicModal] La asignación falló')
      }
    } catch (error: any) {
      console.error('❌ [AssignMechanicModal] Error inesperado:', error)
      toast.error('Error inesperado', {
        description: error.message || 'No se pudo asignar el mecánico'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleClose = () => {
    setSearchTerm('')
    setSelectedMechanicId(currentMechanicId || null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 pointer-events-auto"
      style={{ zIndex: 10000, overflowY: 'auto', overscrollBehavior: 'contain' }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#0A0F1E] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-800 relative z-[10001]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {currentMechanicId ? 'Reasignar Mecánico' : 'Asignar Mecánico'}
              </h2>
              <p className="text-sm text-gray-400">
                Selecciona el mecánico responsable de esta orden
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-6 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar mecánico por nombre o email..."
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Lista de mecánicos */}
        <div className="p-6 overflow-y-auto min-h-[200px] max-h-[400px]">
          {loadingMechanics ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : filteredMechanics.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {searchTerm ? 'No se encontraron mecánicos' : 'No hay mecánicos activos'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMechanics.map((mechanic) => {
                const isCurrent = mechanic.id === currentMechanicId
                const isSelected = selectedMechanicId === mechanic.id

                return (
                  <button
                    key={mechanic.id}
                    onClick={() => setSelectedMechanicId(mechanic.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          isSelected
                            ? 'bg-cyan-500'
                            : 'bg-gray-700'
                        }`}>
                          {(mechanic.full_name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {mechanic.full_name || 'Sin nombre'}
                            </h3>
                            {isCurrent && (
                              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                                Actual
                              </span>
                            )}
                          </div>
                          {mechanic.email && (
                            <p className="text-sm text-gray-400">{mechanic.email}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            {mechanic.role === 'MECANICO' ? 'Mecánico' : mechanic.role}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loadingMechanics}
            className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={loadingMechanics || isAssigning || !selectedMechanicId || selectedMechanicId === currentMechanicId}
            className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(loadingMechanics || isAssigning) && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAssigning ? 'Asignando...' : (currentMechanicId ? 'Reasignar' : 'Asignar')}
          </button>
        </div>
      </div>
    </div>
  )
}
