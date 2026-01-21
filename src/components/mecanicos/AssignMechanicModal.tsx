/**
 * Modal para asignar o reasignar mecánico a una orden de trabajo
 * VERSIÓN CON DEBUG LOGS
 */

'use client'

import { useState, useEffect } from 'react'
import { X, User, Search, Loader2 } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'
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
  auth_user_id: string // ✅ Para debug y comparación
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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(
    currentMechanicId || null
  )
  const [mechanics, setMechanics] = useState<MechanicUser[]>([])
  const [loadingMechanics, setLoadingMechanics] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  
  const { assignOrder } = useEmployees({ autoLoad: false })

  // 🔍 DEBUG: Log inicial del modal
  useEffect(() => {
    if (isOpen) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 [DEBUG] AssignMechanicModal - Props recibidos:')
      console.log('  orderId:', orderId)
      console.log('  currentMechanicId:', currentMechanicId)
      console.log('  currentMechanicId type:', typeof currentMechanicId)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  }, [isOpen, orderId, currentMechanicId])

  // Cargar usuarios con rol MECANICO
  useEffect(() => {
    if (!isOpen) return

    console.log('🔄 [AssignMechanicModal] Modal abierto, cargando mecánicos...', {
      orderId,
      currentMechanicId,
      isOpen
    })

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
        
        console.log('✅ [AssignMechanicModal] Mecánicos cargados:', {
          total: mechanicUsers.length,
          mechanics: mechanicUsers.map((m: any) => ({ 
            id: m.id, 
            auth_user_id: m.auth_user_id,
            name: m.full_name 
          }))
        })

        // 🔍 DEBUG: Verificar si el mecánico actual está en la lista
        if (currentMechanicId) {
          const currentByAuthId = mechanicUsers.find((m: any) => m.auth_user_id === currentMechanicId)
          const currentById = mechanicUsers.find((m: any) => m.id === currentMechanicId)
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('🔍 [DEBUG] Verificando mecánico actual en lista:')
          console.log('  currentMechanicId:', currentMechanicId)
          console.log('  Encontrado por auth_user_id:', currentByAuthId ? 'SÍ' : 'NO', currentByAuthId ? { id: currentByAuthId.id, name: currentByAuthId.full_name } : null)
          console.log('  Encontrado por id:', currentById ? 'SÍ' : 'NO', currentById ? { id: currentById.id, name: currentById.full_name } : null)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
    console.log('🔄 [DEBUG] useEffect - Actualizando selectedMechanicId:', currentMechanicId)
    setSelectedMechanicId(currentMechanicId || null)
  }, [currentMechanicId])

  // 🔍 DEBUG: Log cuando cambia la selección
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DEBUG] Estado del botón:')
    console.log('  selectedMechanicId:', selectedMechanicId)
    console.log('  currentMechanicId:', currentMechanicId)
    console.log('  Son iguales:', selectedMechanicId === currentMechanicId)
    console.log('  loadingMechanics:', loadingMechanics)
    console.log('  isAssigning:', isAssigning)
    console.log('  Botón deshabilitado:', loadingMechanics || isAssigning || !selectedMechanicId || selectedMechanicId === currentMechanicId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [selectedMechanicId, currentMechanicId, loadingMechanics, isAssigning])

  // Filtrar mecánicos por búsqueda
  const filteredMechanics = mechanics.filter(m =>
    (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssign = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 [DEBUG] handleAssign LLAMADO')
    console.log('  orderId:', orderId)
    console.log('  selectedMechanicId:', selectedMechanicId)
    console.log('  currentMechanicId:', currentMechanicId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (!selectedMechanicId) {
      console.log('❌ [DEBUG] No hay mecánico seleccionado')
      toast.error('Por favor selecciona un mecánico')
      return
    }

    // ✅ CORRECCIÓN: Comparar tanto por id como por auth_user_id
    const selectedMechanic = mechanics.find(m => m.id === selectedMechanicId)
    const isSameMechanic = selectedMechanicId === currentMechanicId || 
                          (selectedMechanic && selectedMechanic.auth_user_id === currentMechanicId) ||
                          (selectedMechanic && currentMechanicId && mechanics.find(m => m.id === currentMechanicId)?.auth_user_id === selectedMechanic.auth_user_id)

    if (isSameMechanic) {
      console.log('⚠️ [DEBUG] Mecánico seleccionado es el mismo que el actual')
      toast.info('Este mecánico ya está asignado a la orden')
      return
    }

    setIsAssigning(true)
    
    try {
      console.log('🔄 [AssignMechanicModal] Asignando orden:', {
        orderId,
        selectedMechanicId,
        currentMechanicId,
        selectedMechanic
      })

      // ✅ IMPORTANTE: Usar users.id (no auth_user_id) según migración 024
      // assigned_to en work_orders referencia users.id, no auth_user_id
      console.log('🔍 [DEBUG] ID a enviar a la API:', {
        selectedMechanicId, // Este es users.id
        selectedMechanic: selectedMechanic ? {
          id: selectedMechanic.id,
          auth_user_id: selectedMechanic.auth_user_id,
          name: selectedMechanic.full_name
        } : null
      })

      const success = await assignOrder(orderId, selectedMechanicId) // ✅ Usar users.id
      
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

  // 🔍 DEBUG: Handler para cuando se selecciona un mecánico
  const handleSelectMechanic = (mechanicId: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🖱️ [DEBUG] Mecánico seleccionado:')
    console.log('  mechanicId:', mechanicId)
    console.log('  currentMechanicId:', currentMechanicId)
    const mechanic = mechanics.find(m => m.id === mechanicId)
    console.log('  mechanic:', mechanic ? {
      id: mechanic.id,
      auth_user_id: mechanic.auth_user_id,
      name: mechanic.full_name
    } : null)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    setSelectedMechanicId(mechanicId)
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
        <div className="p-6 overflow-y-auto max-h-[400px]">
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
                // 🔍 DEBUG: Verificar comparación de IDs
                const isCurrentByAuthId = mechanic.auth_user_id === currentMechanicId
                const isCurrentById = mechanic.id === currentMechanicId
                const isCurrent = isCurrentByAuthId || isCurrentById
                const isSelected = selectedMechanicId === mechanic.id

                return (
                  <button
                    key={mechanic.id}
                    onClick={() => handleSelectMechanic(mechanic.id)}
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
                            {/* 🔍 DEBUG: Mostrar IDs (solo en desarrollo) */}
                            {process.env.NODE_ENV === 'development' && (
                              <span className="text-xs text-gray-500">
                                (ID: {mechanic.id.slice(0, 8)}... / Auth: {mechanic.auth_user_id?.slice(0, 8)}...)
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
