"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StandardBreadcrumbs } from "@/components/ui/breadcrumbs"
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Shield,
  User,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Save
} from "lucide-react"
import { getSystemUsers, getUserStats, createSystemUser, updateSystemUser, deleteSystemUser, SystemUser, UserStats } from "@/lib/supabase/system-users"
import { useOrganization } from "@/contexts/OrganizationContext"
import { toast } from "sonner"

export default function UsuariosPage() {
  const { organizationId, loading: orgLoading } = useOrganization()
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<SystemUser[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    usersByRole: {
      admin: 0,
      manager: 0,
      employee: 0,
      viewer: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'employee' as 'admin' | 'manager' | 'employee' | 'viewer',
    is_active: true
  })

  useEffect(() => {
    if (!orgLoading && organizationId) {
      loadData()
    }
  }, [organizationId, orgLoading])

  const loadData = async () => {
    if (!organizationId) {
      console.log('⚠️ No hay organizationId, esperando...')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔄 Cargando usuarios para organizationId:', organizationId)
      
      const [usersData, statsData] = await Promise.all([
        getSystemUsers({ organization_id: organizationId }),
        getUserStats(organizationId)
      ])
      
      console.log('✅ Usuarios cargados:', usersData.length)
      console.log('✅ Estadísticas:', statsData)
      
      // ✅ USAR DATOS REALES - NO MOCKS
      setUsers(usersData)
      
      // Convertir usersByRole de array a objeto para compatibilidad
      const usersByRoleObj = statsData.usersByRole.reduce((acc: any, item: any) => {
        acc[item.role] = item.count
        return acc
      }, { admin: 0, manager: 0, employee: 0, viewer: 0 })
      
      setStats({
        totalUsers: statsData.totalUsers,
        activeUsers: statsData.activeUsers,
        inactiveUsers: statsData.inactiveUsers,
        usersByRole: usersByRoleObj
      })
    } catch (error) {
      console.error('❌ Error loading data:', error)
      toast.error('Error al cargar usuarios', {
        description: error instanceof Error ? error.message : 'Intenta recargar la página'
      })
      // ✅ NO USAR MOCKS - Dejar arrays vacíos
      setUsers([])
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        usersByRole: { admin: 0, manager: 0, employee: 0, viewer: 0 }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="outline" className="bg-red-500 text-white">{role}</Badge>
      case "manager":
        return <Badge variant="outline" className="bg-blue-500 text-white">{role}</Badge>
      case "employee":
        return <Badge variant="outline" className="bg-green-500 text-white">{role}</Badge>
      case "viewer":
        return <Badge variant="outline" className="bg-gray-500 text-white">{role}</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-green-500 text-white">{status}</Badge>
      case "inactive":
        return <Badge variant="outline" className="bg-red-500 text-white">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (id: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!organizationId) {
      toast.error('Error', {
        description: 'No se pudo obtener la organización. Intenta recargar la página.'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        organization_id: organizationId,
        is_active: formData.is_active
      }

      if (editingUser) {
        await updateSystemUser(editingUser.id, userData)
        toast.success('Usuario actualizado exitosamente')
      } else {
        await createSystemUser(userData)
        toast.success('Usuario creado exitosamente')
      }
      
      await loadData()
      setIsDialogOpen(false)
      setEditingUser(null)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        role: 'employee',
        is_active: true
      })
    } catch (error) {
      console.error("❌ Error submitting user:", error)
      toast.error("Error al guardar el usuario", {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user)
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      role: user.role,
      is_active: user.is_active ?? true
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      setIsSubmitting(true)
      try {
        await deleteSystemUser(id)
        await loadData()
        toast.success('Usuario eliminado exitosamente')
      } catch (error) {
        console.error("❌ Error deleting user:", error)
        toast.error("Error al eliminar el usuario", {
          description: error instanceof Error ? error.message : 'Inténtalo de nuevo.'
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role: 'employee',
      is_active: true
    })
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <StandardBreadcrumbs
          currentPage="Usuarios"
          parentPages={[{ label: "Configuraciones", href: "/configuraciones/empresa" }]}
          className="text-xs md:text-sm"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <StandardBreadcrumbs
        currentPage="Usuarios"
        parentPages={[{ label: "Configuraciones", href: "/configuraciones/empresa" }]}
        className="text-xs md:text-sm"
      />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddUser}>
                <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}</DialogTitle>
                <DialogDescription>
                  {editingUser ? "Modifica los datos del usuario." : "Ingresa los datos del nuevo usuario."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/70 border-slate-600 text-white h-11"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/70 border-slate-600 text-white h-11"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/70 border-slate-600 text-white h-11"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-600 text-white focus-visible:border-primary focus-visible:ring-primary/40">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent
                      className="z-[9999] bg-slate-900 text-white border border-slate-600 shadow-2xl"
                      sideOffset={4}
                      position="popper"
                    >
                      <SelectItem value="admin" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Administrador</SelectItem>
                      <SelectItem value="manager" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Gerente</SelectItem>
                      <SelectItem value="employee" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Empleado</SelectItem>
                      <SelectItem value="viewer" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="is_active">Estado</Label>
                  <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(value) => handleSelectChange('is_active', value === 'active')}>
                    <SelectTrigger className="w-full h-11 bg-slate-900 border-slate-600 text-white focus-visible:border-primary focus-visible:ring-primary/40">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent
                      className="z-[9999] bg-slate-900 text-white border border-slate-600 shadow-2xl"
                      sideOffset={4}
                      position="popper"
                    >
                      <SelectItem value="active" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Activo</SelectItem>
                      <SelectItem value="inactive" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingUser ? 'Actualizar' : 'Crear'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Actualmente activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">Deshabilitados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersByRole.admin}</div>
            <p className="text-xs text-muted-foreground">Con acceso completo</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-xl font-semibold">Lista de Usuarios</h3>
        <div className="flex items-center py-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="w-full">
            <table className="w-full text-left">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Usuario</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Rol</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Último Acceso</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getRoleBadge(user.role)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(user.is_active ? 'active' : 'inactive')}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(user)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(user.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
