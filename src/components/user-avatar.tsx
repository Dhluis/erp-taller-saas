"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UserProfile } from "@/components/user-profile"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useSession } from "@/lib/context/SessionContext"
import {
  User,
  Settings,
  Bell,
  LogOut,
  Shield
} from "lucide-react"

export function UserAvatar() {
  const [showProfile, setShowProfile] = useState(false)
  const { profile, getInitials } = useUserProfile()
  const { signOut } = useSession()

  // Datos reales del usuario
  const user = {
    name: profile?.full_name || "Usuario",
    email: profile?.email || "Cargando...",
    role: profile?.role || "user",
    avatar: profile?.avatar_url || ""
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive" className="bg-red-500 text-xs">Admin</Badge>
      case "manager":
        return <Badge variant="default" className="bg-blue-500 text-xs">Manager</Badge>
      case "employee":
        return <Badge variant="secondary" className="bg-green-500 text-xs">Employee</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{role}</Badge>
    }
  }

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await signOut()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {getRoleBadge(user.role)}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notificaciones</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de perfil */}
      {showProfile && (
        <UserProfile />
      )}
    </>
  )
}
