// src/app/mecanicos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Wrench, Mail, Phone, Edit, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import CreateEditMechanicModal from '@/components/mecanicos/CreateEditMechanicModal'
import { AppLayout } from '@/components/layout/AppLayout'

interface Mechanic {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  specialties: string[] | null
  is_active: boolean
}

export default function MecanicosPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMechanicId, setEditingMechanicId] = useState<string | null>(null)

  const fetchMechanics = async () => {
    if (!profile?.workshop_id) {
      console.log('❌ No hay workshop_id en el perfil')
      return
    }

    try {
      setLoading(true)
      
      console.log('🔍 Buscando mecánicos para workshop:', profile.workshop_id)
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('workshop_id', profile.workshop_id)
        .in('role', ['mechanic', 'supervisor', 'receptionist', 'manager'])
        .order('name')

      console.log('📊 Resultado:', { data, error })

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }

      setMechanics(data || [])
      console.log('✅ Mecánicos cargados:', data?.length || 0)
    } catch (error: any) {
      console.error('❌ Error general:', error)
      console.error('❌ Error message:', error?.message)
      console.error('❌ Error code:', error?.code)
      toast.error('Error al cargar mecánicos', {
        description: error?.message || 'Intenta recargar la página'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMechanics()
  }, [profile])

  const toggleMechanicStatus = async (mechanicId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !currentStatus })
        .eq('id', mechanicId)

      if (error) throw error

      toast.success(currentStatus ? 'Mecánico desactivado' : 'Mecánico activado')
      fetchMechanics()
    } catch (error: any) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      mechanic: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-purple-100 text-purple-800',
      receptionist: 'bg-green-100 text-green-800',
      manager: 'bg-orange-100 text-orange-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      mechanic: 'Mecánico',
      supervisor: 'Supervisor',
      receptionist: 'Recepcionista',
      manager: 'Gerente'
    }
    return labels[role] || role
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Cargando mecánicos...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Mecánicos</h1>
            <p className="text-gray-400 mt-1">
              Gestiona tu equipo de trabajo
            </p>
          </div>
          <Button onClick={() => {
            setEditingMechanicId(null)
            setModalOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Mecánico
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{mechanics.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {mechanics.filter(m => m.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Mecánicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {mechanics.filter(m => m.role === 'mechanic').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Supervisores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {mechanics.filter(m => m.role === 'supervisor').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Mecánicos */}
        {mechanics.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No hay mecánicos registrados</h3>
              <p className="text-gray-400 mb-4">Comienza agregando tu primer mecánico</p>
              <Button onClick={() => {
              setEditingMechanicId(null)
              setModalOpen(true)
            }}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Mecánico
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mechanics.map((mechanic) => (
              <Card key={mechanic.id} className={`bg-gray-800 border-gray-700 ${!mechanic.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white">{mechanic.name}</CardTitle>
                      <Badge className={`mt-2 ${getRoleBadgeColor(mechanic.role)}`}>
                        {getRoleLabel(mechanic.role)}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingMechanicId(mechanic.id)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 text-cyan-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMechanicStatus(mechanic.id, mechanic.is_active)}
                      >
                        <Power className={`h-4 w-4 ${mechanic.is_active ? 'text-green-500' : 'text-gray-500'}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mechanic.email && (
                    <div className="flex items-center text-sm text-gray-400">
                      <Mail className="h-4 w-4 mr-2" />
                      {mechanic.email}
                    </div>
                  )}
                  {mechanic.phone && (
                    <div className="flex items-center text-sm text-gray-400">
                      <Phone className="h-4 w-4 mr-2" />
                      {mechanic.phone}
                    </div>
                  )}
                  {mechanic.specialties && mechanic.specialties.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-1">Especialidades:</p>
                      <div className="flex flex-wrap gap-1">
                        {mechanic.specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {!mechanic.is_active && (
                    <div className="pt-2">
                      <Badge variant="destructive">Inactivo</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateEditMechanicModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingMechanicId(null)
          }}
          mechanicId={editingMechanicId}
          onSuccess={fetchMechanics}
        />
      </div>
    </AppLayout>
  )
}

