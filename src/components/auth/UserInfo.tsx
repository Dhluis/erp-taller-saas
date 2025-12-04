'use client'

import { useAuth } from '@/hooks/useAuth'
import { User, Building2, Shield, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function UserInfo() {
  const { user, profile, organization, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-400 text-sm">No hay usuario autenticado</p>
      </div>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'manager':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30'
      case 'mechanic':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'receptionist':
        return 'text-green-400 bg-green-500/10 border-green-500/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'manager':
        return 'Gerente'
      case 'mechanic':
        return 'Mecánico'
      case 'receptionist':
        return 'Recepcionista'
      default:
        return role
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-4">
      {/* Información del Usuario */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-cyan-500/20 rounded-lg">
          <User className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">
            {profile.name || 'Usuario sin nombre'}
          </h3>
          <p className="text-slate-400 text-sm truncate">
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(profile.role)}`}>
              <Shield className="w-3 h-3" />
              {getRoleLabel(profile.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Información de la Organización */}
      {organization && (
        <div className="flex items-start gap-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">
              {organization.name}
            </h4>
            <p className="text-slate-400 text-sm truncate">
              {organization.email}
            </p>
            {organization.phone && (
              <p className="text-slate-500 text-xs truncate">
                {organization.phone}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Botón de Cerrar Sesión */}
      <div className="pt-3 border-t border-slate-700/50">
        <Button
          onClick={signOut}
          variant="secondary"
          className="w-full justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
