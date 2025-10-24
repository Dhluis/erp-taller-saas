'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wrench, AlertTriangle, Mail, ArrowLeft } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function SuspendedPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Obtener perfil del usuario
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(userProfile)
    }
    getUserData()
  }, [router, supabase.auth, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400 mt-2">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-red-500 p-3 rounded-xl">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">ERP Taller</h1>
          <p className="text-slate-400">Cuenta suspendida</p>
        </div>

        {/* Formulario */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Acceso restringido</CardTitle>
            <CardDescription className="text-slate-400">
              Tu cuenta ha sido suspendida temporalmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Información del usuario */}
            <div className="space-y-3">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">Usuario</p>
                <p className="text-white font-medium">{profile.full_name || user.email}</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">Email</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
            </div>

            {/* Alerta */}
            <Alert className="bg-orange-900/20 border-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-orange-300">
                Tu cuenta está inactiva. Contacta al administrador para reactivarla.
              </AlertDescription>
            </Alert>

            {/* Información */}
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">¿Qué puedes hacer?</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Contactar al administrador de tu organización</li>
                <li>• Verificar tu email de confirmación</li>
                <li>• Esperar a que se reactive tu cuenta</li>
              </ul>
            </div>

            {/* Botones */}
            <div className="space-y-2">
              <Button
                onClick={handleSignOut}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white"
              >
                Cerrar sesión
              </Button>
              
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center w-full text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver al login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Si crees que esto es un error, contacta al soporte técnico
          </p>
        </div>
      </div>
    </div>
  )
}














