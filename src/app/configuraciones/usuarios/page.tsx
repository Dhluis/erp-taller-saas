"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  Edit,
  Trash2,
  Save,
  Building2,
  Power,
  PowerOff,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import type { User, CreateUserRequest } from "@/types/user"
import { UserRole, ROLE_NAMES } from "@/lib/auth/permissions"
import { usePermissions } from "@/hooks/usePermissions"
import { useSession } from "@/lib/context/SessionContext"
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

// Schema de validación con Zod
const userSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'ASESOR', 'MECANICO'] as const),
  phone: z.string().optional(),
}).refine((data) => {
  // Si no hay usuario seleccionado (modo crear), password es requerido
  // Esta validación se hace manualmente en onSubmit
  return true
}, {
  message: 'La contraseña debe tener al menos 8 caracteres',
  path: ['password'],
})

type UserFormData = z.infer<typeof userSchema>

interface UserResponse {
  users: User[]
}

export default function UsuariosPage() {
  const router = useRouter()
  const { profile, isLoading: sessionLoading } = useSession()
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
  const [isEditMode, setIsEditMode] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'ASESOR',
      phone: '',
    },
  })

  const watchedRole = watch('role')

  // ✅ PROTECCIÓN DE RUTA: Solo admin puede acceder
  useEffect(() => {
    if (!sessionLoading && profile) {
      if (profile.role !== 'ADMIN') {
        toast.error('No tienes permisos para acceder a esta página')
        router.push('/dashboard')
      }
    }
  }, [profile, sessionLoading, router])

  // Cargar usuarios
  useEffect(() => {
    if (profile?.role === 'ADMIN') {
      loadData()
    }
  }, [profile])

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

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true)

      // ✅ Validación manual: Password requerido en creación
      if (!isEditMode && (!data.password || data.password.length < 8)) {
        toast.error('La contraseña es requerida y debe tener al menos 8 caracteres')
        return
      }

      // ✅ Validación: Password en edición debe tener 8+ caracteres si se proporciona
      if (isEditMode && data.password && data.password.length > 0 && data.password.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres')
        return
      }

      const url = isEditMode ? `/api/users/${editingUser?.id}` : '/api/users'
      const method = isEditMode ? 'PATCH' : 'POST'

      // Preparar payload según el modo
      const payload: any = {
        name: data.name,
        role: data.role,
        phone: data.phone || undefined,
      }

      // En edición, email no se puede cambiar
      if (!isEditMode) {
        payload.email = data.email
      }

      // Password solo si se proporciona
      if (!isEditMode && data.password) {
        payload.password = data.password
      } else if (isEditMode && data.password && data.password.length > 0) {
        payload.password = data.password
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar usuario')
      }

      toast.success(
        isEditMode ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente'
      )
      setIsDialogOpen(false)
      reset()
      setEditingUser(null)
      setIsEditMode(false)
      await loadData()
    } catch (error: any) {
      console.error('Error guardando usuario:', error)
      toast.error('Error al guardar usuario', {
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsEditMode(true)
    setValue('name', (user as any).name || (user as any).full_name || '')
    setValue('email', user.email)
    setValue('role', user.role as UserRole)
    setValue('phone', user.phone || '')
    setValue('password', '') // No mostrar password
    setIsDialogOpen(true)
  }

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: !user.is_active,
        }),
      })

      if (!response.ok) {
        let result
        try {
          const text = await response.text()
          result = text ? JSON.parse(text) : { error: `Error ${response.status}` }
        } catch (parseError) {
          result = { error: `Error ${response.status}: ${response.statusText}` }
        }
        throw new Error(result.error || result.message || 'Error al actualizar usuario')
      }

      const result = await response.json()
      
      if (result.success === false) {
        throw new Error(result.error || 'Error al actualizar usuario')
      }

      toast.success(
        `Usuario ${!user.is_active ? 'activado' : 'desactivado'} exitosamente`
      )
      await loadData()
    } catch (error: any) {
      console.error('Error actualizando usuario:', error)
      toast.error('Error al actualizar usuario', {
        description: error.message || 'Error desconocido',
      })
    }
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setIsEditMode(false)
    reset({
      name: '',
      email: '',
      password: '',
      role: 'ASESOR',
      phone: '',
    })
    setIsDialogOpen(true)
  }

  const handleCloseModal = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
    setIsEditMode(false)
    reset()
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
        const errorData = await response.json()
        // ✅ Si hay detalles adicionales, mostrarlos en la descripción
        const errorMessage = errorData.error || 'Error al eliminar usuario'
        const errorDetails = errorData.details || ''
        const orderIds = errorData.orderIds || [] // ✅ IDs de órdenes para navegación
        const orderCount = errorData.orderCount || 0
        
        // ✅ Si hay órdenes activas, mostrar toast con botón de acción
        if (orderIds.length > 0) {
          toast.error(errorMessage, {
            description: errorDetails,
            duration: 8000, // Mostrar por más tiempo
            action: {
              label: `Ver ${orderCount} orden${orderCount > 1 ? 'es' : ''}`,
              onClick: () => {
                // ✅ Navegar a la página de órdenes
                router.push('/ordenes')
              }
            }
          })
          setDeleteDialogOpen(false)
          setUserToDelete(null)
          return
        }
        
        throw new Error(errorMessage + (errorDetails ? `\n${errorDetails}` : ''))
      }

      await loadData()
      toast.success('Usuario eliminado exitosamente')
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error("❌ Error deleting user:", error)
      const errorMessage = error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      const [mainMessage, ...details] = errorMessage.split('\n')
      
      toast.error(mainMessage, {
        description: details.length > 0 ? details.join('\n') : undefined,
        duration: 6000 // Mostrar por más tiempo si hay detalles
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // No mostrar nada si no es admin
  if (!sessionLoading && profile?.role !== 'ADMIN') {
    return null
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
          {profile?.role === 'ADMIN' && (
            <Button onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
            </Button>
          )}
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
                          onClick={() => handleToggleActive(user)}
                          disabled={isSubmitting}
                          title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {user.is_active ? (
                            <PowerOff className="h-4 w-4 mr-1 text-warning" />
                          ) : (
                            <Power className="h-4 w-4 mr-1 text-success" />
                          )}
                          {user.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        {/* ✅ Ocultar botón eliminar para mecánicos */}
                        {!permissions.isMechanic && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de crear/editar usuario */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar Usuario' : 'Crear Usuario'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Modifica la información del usuario'
                : 'Completa los datos para crear un nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-error">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nombre completo"
              />
              {errors.name && (
                <p className="text-sm text-error">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-error">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="usuario@ejemplo.com"
                disabled={isEditMode}
              />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña <span className="text-error">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Mínimo 8 caracteres"
                />
                {errors.password && (
                  <p className="text-sm text-error">{errors.password.message}</p>
                )}
              </div>
            )}

            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Nueva Contraseña (opcional)
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Dejar vacío para mantener la actual"
                />
                {errors.password && (
                  <p className="text-sm text-error">{errors.password.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">
                Rol <span className="text-error">*</span>
              </Label>
              <Select
                value={watchedRole}
                onValueChange={(value) => setValue('role', value as UserRole)}
              >
                <SelectTrigger id="role" className="bg-slate-900 border-slate-600 text-white focus-visible:border-primary focus-visible:ring-primary/40">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent
                  className="z-[9999] bg-slate-900 text-white border border-slate-600 shadow-2xl"
                  sideOffset={4}
                  position="popper"
                >
                  <SelectItem value="ADMIN" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">
                    {ROLE_NAMES.ADMIN}
                  </SelectItem>
                  <SelectItem value="ASESOR" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">
                    {ROLE_NAMES.ASESOR}
                  </SelectItem>
                  <SelectItem value="MECANICO" className="text-white hover:bg-slate-800 focus:bg-primary/25 focus:text-white cursor-pointer">
                    {ROLE_NAMES.MECANICO}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-error">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+52 555 123 4567"
              />
              {errors.phone && (
                <p className="text-sm text-error">{errors.phone.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              usuario{' '}
              <strong>
                {(userToDelete as any)?.name || (userToDelete as any)?.full_name || userToDelete?.email}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-error hover:bg-error/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
