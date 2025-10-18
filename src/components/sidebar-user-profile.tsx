'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  User, 
  Settings, 
  Shield, 
  Bell, 
  LogOut, 
  ChevronDown,
  Edit3,
  Key,
  HelpCircle
} from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { QuickSettings } from '@/components/quick-settings';
import { useSidebar } from '@/contexts/SidebarContext';

interface SidebarUserProfileProps {
  className?: string;
}

export function SidebarUserProfile({ className = '' }: SidebarUserProfileProps) {
  const { profile, getInitials } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const { isCollapsed } = useSidebar();

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
          
          {/* Acciones principales */}
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center">
              <Edit3 className="mr-2 h-4 w-4" />
              <span>Editar Perfil</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center">
              <Key className="mr-2 h-4 w-4" />
              <span>Cambiar Contraseña</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Configuraciones */}
          <QuickSettings>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración Rápida</span>
            </DropdownMenuItem>
          </QuickSettings>
          
          <DropdownMenuItem asChild>
            <Link href="/configuraciones/empresa" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración de Empresa</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/configuraciones/usuarios" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Gestión de Usuarios</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link href="/configuraciones/sistema" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración del Sistema</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Seguridad */}
          <DropdownMenuItem asChild>
            <Link href="/perfil" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>Configuración de Seguridad</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Ayuda y soporte */}
          <DropdownMenuItem asChild>
            <Link href="/ayuda" className="flex items-center">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Ayuda y Soporte</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Cerrar sesión */}
          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
}
