'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: ('admin' | 'manager' | 'mechanic' | 'receptionist')[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, no mostrar nada (el useEffect se encargará de redirigir)
  if (!user || !profile) {
    return null
  }

  // Verificar roles si se especifican
  if (requiredRoles.length > 0 && !requiredRoles.includes(profile.role)) {
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">
            Acceso Denegado
          </h1>
          <p className="text-slate-400 mb-6">
            No tienes permisos para acceder a esta sección. 
            Se requiere uno de los siguientes roles: {requiredRoles.join(', ')}.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4" />
            <span>Tu rol actual: {profile.role}</span>
          </div>
        </div>
      </div>
    )
  }

  // Si todo está bien, mostrar el contenido
  return <>{children}</>
}

// Componentes específicos para diferentes roles
export function AdminOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function MechanicOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['mechanic', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ReceptionistOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['receptionist', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: ('admin' | 'manager' | 'mechanic' | 'receptionist')[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, no mostrar nada (el useEffect se encargará de redirigir)
  if (!user || !profile) {
    return null
  }

  // Verificar roles si se especifican
  if (requiredRoles.length > 0 && !requiredRoles.includes(profile.role)) {
    return fallback || (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">
            Acceso Denegado
          </h1>
          <p className="text-slate-400 mb-6">
            No tienes permisos para acceder a esta sección. 
            Se requiere uno de los siguientes roles: {requiredRoles.join(', ')}.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4" />
            <span>Tu rol actual: {profile.role}</span>
          </div>
        </div>
      </div>
    )
  }

  // Si todo está bien, mostrar el contenido
  return <>{children}</>
}

// Componentes específicos para diferentes roles
export function AdminOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['manager', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function MechanicOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['mechanic', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ReceptionistOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['receptionist', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}






