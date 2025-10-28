/**
 * Modal para asignar o reasignar mecánico a una orden de trabajo
 */

'use client'

import { useState, useEffect } from 'react'
import { X, User, Search, Loader2 } from 'lucide-react'
import { useMechanics, useEmployees } from '@/hooks/useEmployees'

interface AssignMechanicModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  currentMechanicId?: string | null
  onSuccess?: () => void
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
  
  const { mechanics, loading: loadingMechanics } = useMechanics()
  const { assignOrder, loading: assigning } = useEmployees({ autoLoad: false })

  // Actualizar selección cuando cambia el mecánico actual
  useEffect(() => {
    setSelectedMechanicId(currentMechanicId || null)
  }, [currentMechanicId])

  // Filtrar mecánicos por búsqueda
  const filteredMechanics = mechanics.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAssign = async () => {
    if (!selectedMechanicId) {
      alert('Por favor selecciona un mecánico')
      return
    }

    const success = await assignOrder(orderId, selectedMechanicId)
    
    if (success) {
      onSuccess?.()
      onClose()
    }
  }

  const handleClose = () => {
    setSearchTerm('')
    setSelectedMechanicId(currentMechanicId || null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0F1E] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-800">
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
              {filteredMechanics.map((mechanic) => (
                <button
                  key={mechanic.id}
                  onClick={() => setSelectedMechanicId(mechanic.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedMechanicId === mechanic.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        selectedMechanicId === mechanic.id
                          ? 'bg-cyan-500'
                          : 'bg-gray-700'
                      }`}>
                        {mechanic.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">
                            {mechanic.name}
                          </h3>
                          {mechanic.id === currentMechanicId && (
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                              Actual
                            </span>
                          )}
                        </div>
                        {mechanic.email && (
                          <p className="text-sm text-gray-400">{mechanic.email}</p>
                        )}
                        {mechanic.specialties && mechanic.specialties.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {mechanic.specialties.map((specialty: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedMechanicId === mechanic.id && (
                      <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
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
            disabled={loadingMechanics || !selectedMechanicId || selectedMechanicId === currentMechanicId}
            className="px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMechanics && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentMechanicId ? 'Reasignar' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  )
}

