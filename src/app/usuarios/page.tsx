'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/context/SessionContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { User, CreateUserRequest } from '@/types/user'
import { UserRole, ROLE_NAMES } from '@/lib/auth/permissions'

// Schema de validación con Zod
// Password es opcional porque en edición puede estar vacío
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
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      loadUsers()
    }
  }, [profile])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }

      const data: UserResponse = await response.json()
      setUsers(data.users || [])
    } catch (error: any) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios', {
        description: error.message,
      })
    } finally {
      setLoading(false)
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

      const url = isEditMode ? `/api/users/${selectedUser?.id}` : '/api/users'
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
      setIsModalOpen(false)
      reset()
      setSelectedUser(null)
      setIsEditMode(false)
      await loadUsers()
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
    setSelectedUser(user)
    setIsEditMode(true)
    setValue('name', user.name)
    setValue('email', user.email)
    setValue('role', user.role as UserRole)
    setValue('phone', user.phone || '')
    setValue('password', '') // No mostrar password
    setIsModalOpen(true)
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al eliminar usuario')
      }

      toast.success('Usuario eliminado exitosamente')
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error: any) {
      console.error('Error eliminando usuario:', error)
      toast.error('Error al eliminar usuario', {
        description: error.message,
      })
    }
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
        // Intentar parsear JSON, pero manejar el caso cuando no hay contenido
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
      
      // Verificar si la respuesta tiene success: false
      if (result.success === false) {
        throw new Error(result.error || 'Error al actualizar usuario')
      }

      toast.success(
        `Usuario ${!user.is_active ? 'activado' : 'desactivado'} exitosamente`
      )
      await loadUsers()
    } catch (error: any) {
      console.error('Error actualizando usuario:', error)
      toast.error('Error al actualizar usuario', {
        description: error.message || 'Error desconocido',
      })
    }
  }

  const handleOpenCreateModal = () => {
    setSelectedUser(null)
    setIsEditMode(false)
    reset({
      name: '',
      email: '',
      password: '',
      role: 'ASESOR',
      phone: '',
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
    setIsEditMode(false)
    reset()
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'error' as const
      case 'ASESOR':
        return 'info' as const
      case 'MECANICO':
        return 'success' as const
      default:
        return 'secondary' as const
    }
  }

  // No mostrar nada si no es admin
  if (!sessionLoading && profile?.role !== 'ADMIN') {
    return null
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Gestión de Usuarios"
          description="Administra los usuarios de tu organización"
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Usuarios
            </CardTitle>
            {profile?.role === 'ADMIN' && (
              <Button onClick={handleOpenCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay usuarios registrados</p>
                {profile?.role === 'ADMIN' && (
                  <Button onClick={handleOpenCreateModal} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer usuario
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role as UserRole)}>
                          {ROLE_NAMES[user.role as UserRole] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? 'success' : 'secondary'}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.is_active ? (
                              <PowerOff className="h-4 w-4 text-warning" />
                            ) : (
                              <Power className="h-4 w-4 text-success" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de crear/editar usuario */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
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
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    {ROLE_NAMES.ADMIN}
                  </SelectItem>
                  <SelectItem value="ASESOR">
                    {ROLE_NAMES.ASESOR}
                  </SelectItem>
                  <SelectItem value="MECANICO">
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              usuario{' '}
              <strong>
                {selectedUser?.name} ({selectedUser?.email})
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error hover:bg-error/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

