'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  LogOut, 
  ChevronDown,
  Key,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSidebar } from '@/contexts/SidebarContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SidebarUserProfileProps {
  className?: string;
}

export function SidebarUserProfile({ className = '' }: SidebarUserProfileProps) {
  const { profile, getInitials } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const { isCollapsed } = useSidebar();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Sesión cerrada correctamente');
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleChangePassword = async () => {
    // Validaciones
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsChangingPassword(true);

    try {
      const supabase = createClient();
      
      // Verificar contraseña actual reautenticando
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        toast.error('La contraseña actual es incorrecta');
        return;
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Contraseña actualizada correctamente');
      setIsPasswordModalOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className={`p-4 border-t ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-2 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`p-4 border-t ${className}`}>
        <div className="bg-slate-800/60 border border-gray-700/50 rounded-lg p-3 mb-4">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{profile.full_name}</p>
                        <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                          {profile.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>
              </Button>
            </DropdownMenuTrigger>
          
            <DropdownMenuContent 
              align="end" 
              className="w-64 !bg-slate-900 !backdrop-blur-sm !border-gray-700/60 rounded-xl shadow-2xl z-[100]" 
              side="top"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Información de la organización */}
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <p className="font-medium">{profile.organization_name}</p>
                <p>Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES')}</p>
              </div>
              
              <DropdownMenuSeparator />
              
              {/* Mi Perfil */}
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </Link>
              </DropdownMenuItem>
              
              {/* Cambiar Contraseña */}
              <DropdownMenuItem 
                onSelect={() => {
                  setIsPasswordModalOpen(true);
                  setIsOpen(false);
                }}
                className="flex items-center cursor-pointer"
              >
                <Key className="mr-2 h-4 w-4" />
                <span>Cambiar Contraseña</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Ayuda y soporte */}
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
              
              {/* Cerrar sesión */}
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

      {/* Modal de Cambiar Contraseña */}
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
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Ingresa tu contraseña actual"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Repite la nueva contraseña"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }}
              disabled={isChangingPassword}
            >
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
  );
}
