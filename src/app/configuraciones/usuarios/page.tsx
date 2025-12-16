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
  Save,
  Building2
} from "lucide-react"
import { toast } from "sonner"
import type { User, CreateUserRequest } from "@/types/user"
import { UserRole, ROLE_NAMES } from "@/lib/auth/permissions"
import { usePermissions } from "@/hooks/usePermissions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserResponse {
  users: User[]
}

export default function UsuariosPage() {
  const permissions = usePermissions()
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ASESOR' as UserRole,
    phone: '',
    password: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }

      const data: UserResponse = await response.json()
      const usersData = data.users || []
      
      console.log('[UsuariosPage] Datos recibidos del API:', usersData.length, 'usuarios')
      if (usersData.length > 0) {
        console.log('[UsuariosPage] Primer usuario recibido:', {
          id: usersData[0].id,
          email: usersData[0].email,
          name: (usersData[0] as any).name,
          full_name: (usersData[0] as any).full_name,
          role: usersData[0].role
        })
      }
      
      setUsers(usersData)
      
      // Calcular estadísticas
      const totalUsers = usersData.length
      const activeUsers = usersData.filter(u => u.is_active).length
      const inactiveUsers = totalUsers - activeUsers
      const adminUsers = usersData.filter(u => u.role === 'ADMIN').length
      
      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers
      })
    } catch (error) {
      console.error('❌ Error loading data:', error)
      toast.error('Error al cargar usuarios', {
        description: error instanceof Error ? error.message : 'Intenta recargar la página'
      })
      setUsers([])
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        adminUsers: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (user) => {
      const name = (user as any).name || (user as any).full_name || ''
      return (
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  )

  const getRoleBadge = (role: UserRole) => {
    const roleName = ROLE_NAMES[role] || role
    switch (role) {
      case "ADMIN":
        return <Badge variant="outline" className="bg-red-500 text-white">{roleName}</Badge>
      case "ASESOR":
        return <Badge variant="outline" className="bg-blue-500 text-white">{roleName}</Badge>
      case "MECANICO":
        return <Badge variant="outline" className="bg-green-500 text-white">{roleName}</Badge>
      default:
        return <Badge variant="outline">{roleName}</Badge>
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

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value as UserRole }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)

    try {
      if (editingUser) {
        // Actualizar usuario
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            phone: formData.phone || undefined
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al actualizar usuario')
        }

        toast.success('Usuario actualizado exitosamente')
      } else {
        // Crear usuario
        if (!formData.password || formData.password.length < 8) {
          toast.error('La contraseña debe tener al menos 8 caracteres')
          setIsSubmitting(false)
          return
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone || undefined
          } as CreateUserRequest)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al crear usuario')
        }

        toast.success('Usuario creado exitosamente')
      }
      
      await loadData()
      setIsDialogOpen(false)
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        role: 'ASESOR',
        phone: '',
        password: ''
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

  const handleEdit = (user: User) => {
    setEditingUser(user)
    const userName = (user as any).name || (user as any).full_name || ''
    setFormData({
      name: userName,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      password: '' // No mostrar contraseña
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    // ✅ Validar permisos: Mecánicos no pueden eliminar usuarios
    if (permissions.isMechanic) {
      toast.error('No tienes permisos para eliminar usuarios', {
        description: 'Solo administradores y asesores pueden eliminar usuarios.'
      })
      return
    }

    // Abrir diálogo de confirmación
    const user = users.find(u => u.id === id)
    setUserToDelete(user || null)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar usuario')
      }

      await loadData()
      toast.success('Usuario eliminado exitosamente')
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error("❌ Error deleting user:", error)
      toast.error("Error al eliminar el usuario", {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      role: 'ASESOR',
      phone: '',
      password: ''
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
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
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
                {!editingUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900/70 border-slate-600 text-white h-11"
                      required={!editingUser}
                      minLength={8}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono (Opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/70 border-slate-600 text-white h-11"
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
                      <SelectItem value="ADMIN" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">{ROLE_NAMES.ADMIN}</SelectItem>
                      <SelectItem value="ASESOR" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">{ROLE_NAMES.ASESOR}</SelectItem>
                      <SelectItem value="MECANICO" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">{ROLE_NAMES.MECANICO}</SelectItem>
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
            <div className="text-2xl font-bold">{stats.adminUsers}</div>
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
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Organización</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Teléfono</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Rol</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Estado</th>
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
                          <p className="font-medium">{(user as any).name || (user as any).full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{(user as any).organization_name || 'N/A'}</span>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {user.phone || '-'}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getRoleBadge(user.role)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{getStatusBadge(user.is_active ? 'active' : 'inactive')}</td>
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
