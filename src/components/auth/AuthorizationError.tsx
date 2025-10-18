'use client'

import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Shield, Home } from 'lucide-react'
import Link from 'next/link'

export function AuthorizationError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  if (!error) return null

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'unauthorized':
        return {
          title: 'Acceso Denegado',
          message: 'No tienes permisos para acceder a esa sección.',
          icon: Shield
        }
      case 'inactive':
        return {
          title: 'Cuenta Inactiva',
          message: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
          icon: AlertTriangle
        }
      default:
        return {
          title: 'Error de Acceso',
          message: 'Ha ocurrido un error al verificar tus permisos.',
          icon: AlertTriangle
        }
    }
  }

  const errorInfo = getErrorMessage(error)
  const IconComponent = errorInfo.icon

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <IconComponent className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-400 font-medium mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-red-300/80 text-sm mb-3">
            {errorInfo.message}
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}


import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Shield, Home } from 'lucide-react'
import Link from 'next/link'

export function AuthorizationError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  if (!error) return null

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'unauthorized':
        return {
          title: 'Acceso Denegado',
          message: 'No tienes permisos para acceder a esa sección.',
          icon: Shield
        }
      case 'inactive':
        return {
          title: 'Cuenta Inactiva',
          message: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
          icon: AlertTriangle
        }
      default:
        return {
          title: 'Error de Acceso',
          message: 'Ha ocurrido un error al verificar tus permisos.',
          icon: AlertTriangle
        }
    }
  }

  const errorInfo = getErrorMessage(error)
  const IconComponent = errorInfo.icon

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <IconComponent className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-400 font-medium mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-red-300/80 text-sm mb-3">
            {errorInfo.message}
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
