'use client'

/**
 * Página de Gestión de Usuarios e Invitaciones
 * Permite a administradores gestionar usuarios y enviar invitaciones
 */
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/context/SessionContext'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  Mail,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Calendar,
  Edit,
  Trash2,
  Send,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name?: string
  name?: string
  role: string
  organization_id: string
  workshop_id?: string
  is_active?: boolean
  created_at: string
  updated_at?: string
}

interface Invitation {
  id: string
  organization_id: string
  email: string
  role: string
  invited_by: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  accepted_at?: string
  created_at: string
}

export default function UsuariosPage() {
  const router = useRouter()
  const { user, profile, organizationId, isLoading: sessionLoading } = useSession()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Formulario de invitación
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    message: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verificar permisos de admin
  useEffect(() => {
    if (!sessionLoading && (!user || !profile)) {
      router.push('/auth/login')
      return
    }

    if (profile && !['admin', 'manager'].includes(profile.role)) {
      toast.error('No tienes permisos para acceder a esta página')
      router.push('/dashboard')
      return
    }

    if (organizationId) {
      loadData()
    }
  }, [user, profile, organizationId, sessionLoading, router])

  const loadData = async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      // Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Cargar invitaciones pendientes
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitationsError) throw invitationsError

      setUsers(usersData || [])
      setInvitations(invitationsData || [])
    } catch (error: any) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
          message: inviteForm.message || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear invitación')
      }

      toast.success('Invitación enviada', {
        description: `Se envió una invitación a ${inviteForm.email}`
      })

      setIsInviteDialogOpen(false)
      setInviteForm({ email: '', role: 'user', message: '' })
      await loadData()
    } catch (error: any) {
      console.error('Error invitando usuario:', error)
      toast.error('Error al enviar invitación', {
        description: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch('/api/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar invitación')
      }

      toast.success('Invitación reenviada', {
        description: 'El email de invitación ha sido reenviado'
      })
    } catch (error: any) {
      console.error('Error reenviando invitación:', error)
      toast.error('Error al reenviar invitación', {
        description: error.message
      })
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta invitación?')) {
      return
    }

    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar invitación')
      }

      toast.success('Invitación cancelada')
      await loadData()
    } catch (error: any) {
      console.error('Error cancelando invitación:', error)
      toast.error('Error al cancelar invitación', {
        description: error.message
      })
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('organization_id', organizationId)

      if (error) throw error

      toast.success('Rol actualizado')
      await loadData()
    } catch (error: any) {
      console.error('Error actualizando rol:', error)
      toast.error('Error al actualizar rol', {
        description: error.message
      })
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('organization_id', organizationId)

      if (error) throw error

      toast.success(`Usuario ${!currentStatus ? 'activado' : 'desactivado'}`)
      await loadData()
    } catch (error: any) {
      console.error('Error actualizando estado:', error)
      toast.error('Error al actualizar estado', {
        description: error.message
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/10 text-red-400 border-red-500/20',
      manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      mechanic: 'bg-green-500/10 text-green-400 border-green-500/20',
      receptionist: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      user: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
    return (
      <Badge variant="outline" className={colors[role] || colors.user}>
        {role}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      )
    }
    if (status === 'accepted') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aceptada
        </Badge>
      )
    }
    if (status === 'expired') {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
          <X className="w-3 h-3 mr-1" />
          Expirada
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-slate-400">No tienes una organización asignada</p>
          <Button onClick={() => router.push('/onboarding')} className="mt-4">
            Configurar Organización
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-slate-400 mt-1">Administra usuarios e invitaciones de tu organización</p>
        </div>
        <Button
          onClick={() => loadData()}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">Usuarios Actuales</TabsTrigger>
          <TabsTrigger value="invitations">Invitaciones</TabsTrigger>
        </TabsList>

        {/* TAB: Usuarios Actuales */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuarios de la Organización
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No hay usuarios registrados</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Usuario</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Rol</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Estado</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Registro</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {user.full_name || user.name || 'Sin nombre'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Mail className="w-4 h-4" />
                              {user.email}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleChangeRole(user.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8 bg-slate-900 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                <SelectItem value="admin">admin</SelectItem>
                                <SelectItem value="manager">manager</SelectItem>
                                <SelectItem value="mechanic">mechanic</SelectItem>
                                <SelectItem value="receptionist">receptionist</SelectItem>
                                <SelectItem value="user">user</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(user.id, user.is_active ?? true)}
                              className="h-8"
                            >
                              {user.is_active ? (
                                <UserCheck className="w-4 h-4 text-green-400" />
                              ) : (
                                <UserX className="w-4 h-4 text-red-400" />
                              )}
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(user.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getRoleBadge(user.role)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Invitaciones */}
        <TabsContent value="invitations" className="space-y-6">
          <div className="flex items-center justify-between">
            <Card className="bg-slate-800/50 border-slate-700 flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Invitaciones Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No hay invitaciones pendientes</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Rol</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Fecha</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Expira</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {invitations.map((invitation) => {
                          const daysLeft = getDaysUntilExpiry(invitation.expires_at)
                          return (
                            <tr key={invitation.id} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-white">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  {invitation.email}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {getRoleBadge(invitation.role)}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(invitation.created_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {daysLeft > 0 ? (
                                  <span className="text-yellow-400 text-sm">
                                    {daysLeft} día{daysLeft !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-red-400 text-sm">Expirada</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                    className="h-8"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                    className="h-8 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="ml-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invitar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Envía una invitación por email para que se una a tu organización
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="usuario@ejemplo.com"
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="mechanic">Mecánico</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje Personalizado (Opcional)</Label>
                    <Textarea
                      id="message"
                      value={inviteForm.message}
                      onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                      placeholder="Mensaje opcional para el invitado..."
                      rows={3}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Invitación
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
