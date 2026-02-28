'use client'

import { Bars3Icon } from '@heroicons/react/24/outline'
import ModernIcons from '@/components/icons/ModernIcons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogoWithText } from '@/components/ui/Logo'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUserProfile } from '@/hooks/use-user-profile'
import { usePermissions } from '@/hooks/usePermissions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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
  User,
  LogOut,
  ChevronDown,
  Key,
  HelpCircle,
  Building2,
  Users,
  Settings,
  CreditCard,
  Loader2,
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react'
import { useSession } from '@/lib/context/SessionContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TopBarProps {
  onMenuClick?: () => void
  title?: string
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const pathname = usePathname()
  const { profile, getInitials } = useUserProfile()
  const { signOut: sessionSignOut } = useSession()
  const permissions = usePermissions()
  const isMechanic = permissions.isMechanic
  
  const isCitasActive = pathname?.startsWith('/citas')
  const isClientesActive = pathname?.startsWith('/clientes')
  const isOrdenesActive = pathname?.startsWith('/ordenes')
  const isReportesActive = pathname?.startsWith('/reportes')
  const isWhatsAppActive = pathname?.startsWith('/dashboard/whatsapp')
  const isLeadsActive = pathname?.startsWith('/leads')
  
  const userName = profile?.full_name || 'Usuario'
  const userEmail = profile?.email || 'Cargando...'
  const userInitials = profile ? getInitials(profile.full_name) : 'U'

  const handleSignOut = async () => {
    try {
      toast.success('Cerrando sesión...')
      await sessionSignOut()
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Por favor completa todos los campos')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setIsChangingPassword(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user || !user.email) {
        toast.error('Error al obtener información del usuario')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') ||
            signInError.message.includes('Email not confirmed') ||
            signInError.status === 400) {
          toast.error('La contraseña actual es incorrecta')
        } else {
          toast.error(`Error: ${signInError.message}`)
        }
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) {
        toast.error(`Error al actualizar: ${updateError.message}`)
        return
      }

      toast.success('Contraseña actualizada correctamente')
      setIsPasswordModalOpen(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswords({ current: false, new: false, confirm: false })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error?.message || 'Error al cambiar la contraseña')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const resetPasswordModal = () => {
    setIsPasswordModalOpen(false)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPasswords({ current: false, new: false, confirm: false })
  }

  return (
    <>
      <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6 text-text-primary" />
            </button>
          )}
          
          {/* ✅ NAVEGACIÓN SIMPLIFICADA PARA MECÁNICOS - Solo Órdenes */}
          {isMechanic ? (
            <Link href="/ordenes/kanban">
              <Button
                variant={isOrdenesActive ? "primary" : "outline"}
                className={cn(
                  "transition-all duration-200 gap-2",
                  "min-h-[44px] min-w-[44px] md:min-w-auto", // ✅ Mobile-first: botones táctiles grandes
                  isOrdenesActive 
                    ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                    : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                )}
              >
                <ModernIcons.Ordenes size={18} />
                <span className="text-sm font-medium hidden sm:inline">Mis Órdenes</span>
              </Button>
            </Link>
          ) : (
            <>
              {/* Botones de navegación - movidos desde sidebar */}
              <Link href="/citas">
                <Button
                  variant={isCitasActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isCitasActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Citas size={16} />
                  <span className="text-sm font-medium">Citas</span>
                </Button>
              </Link>
              
              <Link href="/clientes">
                <Button
                  variant={isClientesActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isClientesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Clientes size={16} />
                  <span className="text-sm font-medium">Clientes</span>
                </Button>
              </Link>
              
              <Link href="/ordenes">
                <Button
                  variant={isOrdenesActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isOrdenesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Ordenes size={16} />
                  <span className="text-sm font-medium">Órdenes</span>
                </Button>
              </Link>
              
              <Link href="/reportes">
                <Button
                  variant={isReportesActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isReportesActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.Reportes size={16} />
                  <span className="text-sm font-medium">Reportes</span>
                </Button>
              </Link>
              
              <Link href="/leads">
                <Button
                  variant={isLeadsActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isLeadsActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <TrendingUp size={16} className={isLeadsActive ? "text-white" : "text-blue-400"} />
                  <span className="text-sm font-medium">CRM / Leads</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/whatsapp">
                <Button
                  variant={isWhatsAppActive ? "primary" : "outline"}
                  className={cn(
                    "transition-all duration-200 gap-2",
                    isWhatsAppActive 
                      ? "bg-primary text-bg-primary hover:bg-primary-dark" 
                      : "border-border bg-bg-tertiary text-text-primary hover:bg-bg-quaternary hover:border-primary/50"
                  )}
                >
                  <ModernIcons.WhatsApp size={16} />
                  <span className="text-sm font-medium">WhatsApp</span>
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div>
            <NotificationBell />
          </div>
          
          {/* User Profile Dropdown */}
          <div className="pl-4 border-l border-border">
            <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer outline-none">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} alt={userName} />
                    <AvatarFallback className="bg-primary text-bg-primary font-bold text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-text-primary truncate max-w-[150px]">{userName}</p>
                    <p className="text-xs text-text-secondary truncate max-w-[150px]">{userEmail}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-text-secondary hidden sm:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 !bg-slate-900 !backdrop-blur-sm !border-gray-700/60 rounded-xl shadow-2xl z-[100]"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{userName}</p>
                      {profile?.role && (
                        <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                          {profile.role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {profile?.organization_name && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      <p className="font-medium">{profile.organization_name}</p>
                      {profile.created_at && (
                        <p>Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES')}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => {
                    setIsPasswordModalOpen(true)
                    setIsUserMenuOpen(false)
                  }}
                  className="flex items-center cursor-pointer"
                >
                  <Key className="mr-2 h-4 w-4" />
                  <span>Cambiar Contraseña</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/configuraciones/empresa" className="flex items-center cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Empresa</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/configuraciones/usuarios" className="flex items-center cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Usuarios</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/configuraciones/sistema" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Sistema</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings/billing" className="flex items-center cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Planes</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <a
                    href="https://soporte.eagles.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center cursor-pointer"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Ayuda y Soporte</span>
                  </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña actual y elige una nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topbar-current-password">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="topbar-current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Ingresa tu contraseña actual"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topbar-new-password">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="topbar-new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topbar-confirm-password">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="topbar-confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPasswordModal} disabled={isChangingPassword}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
