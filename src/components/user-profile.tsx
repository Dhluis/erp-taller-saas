"use client"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Settings,
  Save,
  Edit,
  Camera,
  Bell,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useSession } from "@/lib/context/SessionContext"
import { toast } from "sonner"

export function UserProfile() {
  const { profile, isSaving, updateProfile, changePassword, uploadAvatar, removeAvatar } = useUserProfile()
  const { signOut } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: profile?.full_name || '',
    phone: profile?.phone || '',
  })

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
      case "ADMIN":
        return <Badge variant="error">Administrador</Badge>
      case "manager":
        return <Badge variant="info">Gerente</Badge>
      case "employee":
        return <Badge variant="success">Empleado</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const handleEditClick = () => {
    setFormData({
      name: profile?.full_name || '',
      phone: profile?.phone || '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      await updateProfile({ full_name: formData.name, phone: formData.phone })
      setIsEditing(false)
      toast.success("Perfil actualizado correctamente")
    } catch {
      toast.error("Error al guardar el perfil")
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setShowPasswordForm(false)
  }

  const handleChangePassword = async () => {
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres")
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    try {
      await changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      })
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
      toast.success("Contraseña actualizada correctamente")
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar la contraseña")
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAvatar(file)
      toast.success("Foto de perfil actualizada")
    } catch (err: any) {
      toast.error(err?.message || "Error al subir la imagen")
    }
    e.target.value = ''
  }

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar()
      toast.success("Foto de perfil eliminada")
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar la imagen")
    }
  }

  const handleLogout = async () => {
    await signOut()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3">
          <User className="h-4 w-4" />
          Mi Perfil
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil de Usuario
          </DialogTitle>
          <DialogDescription>
            Gestiona tu información personal y configuración
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
                {!isEditing && !showPasswordForm && (
                  <Button variant="outline" size="sm" onClick={handleEditClick}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="relative group w-16 h-16">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white p-1 hover:text-cyan-400"
                      title="Cambiar foto"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    {profile?.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="text-white p-1 hover:text-red-400"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{profile?.full_name || 'Usuario'}</h3>
                  <p className="text-sm text-muted-foreground">{profile?.email || ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {profile?.role && getRoleBadge(profile.role)}
                  </div>
                </div>
              </div>

              {/* Formulario edición */}
              {isEditing ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile?.phone || 'No especificado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile?.email || ''}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información de cuenta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Información de Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Miembro desde</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cambiar contraseña */}
          {showPasswordForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPwd ? 'text' : 'password'}
                      value={pwdForm.currentPassword}
                      onChange={(e) => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2.5 text-muted-foreground"
                      onClick={() => setShowCurrentPwd(v => !v)}
                    >
                      {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showNewPwd ? 'text' : 'password'}
                      value={pwdForm.newPassword}
                      onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2.5 text-muted-foreground"
                      onClick={() => setShowNewPwd(v => !v)}
                    >
                      {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmar nueva contraseña</Label>
                  <Input
                    type="password"
                    value={pwdForm.confirmPassword}
                    onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleChangePassword} size="sm" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Guardando...' : 'Actualizar'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Acciones */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleLogout} className="text-red-500 hover:text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
            {!showPasswordForm && (
              <Button variant="outline" className="flex-1" onClick={() => setShowPasswordForm(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Cambiar Contraseña
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
