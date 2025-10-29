'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wrench, Building2, User } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [router, supabase.auth])

  const handleCompleteSetup = async () => {
    setLoading(true)
    setError('')

    try {
      // Verificar si ya tiene perfil
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Ya tiene perfil, redirigir al dashboard
        router.push('/dashboard')
        return
      }

      // Si no tiene perfil, redirigir al registro
      router.push('/auth/register')
    } catch (err) {
      setError('Error al verificar el perfil. Intenta nuevamente.')
      console.error('Setup error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-cyan-500 p-3 rounded-xl">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">ERP Taller</h1>
          <p className="text-slate-400">Configuración inicial</p>
        </div>

        {/* Formulario */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">¡Bienvenido!</CardTitle>
            <CardDescription className="text-slate-400">
              Necesitamos completar tu perfil para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Información del usuario */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <User className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-300">Email</p>
                  <p className="text-white font-medium">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <Alert className="bg-red-900/20 border-red-800">
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Información */}
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">¿Qué necesitas hacer?</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Completar tu información personal</li>
                <li>• Configurar tu taller/organización</li>
                <li>• Establecer permisos y roles</li>
              </ul>
            </div>

            {/* Botón */}
            <Button
              onClick={handleCompleteSetup}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Continuar configuración'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Este proceso solo toma unos minutos
          </p>
        </div>
      </div>
    </div>
  )
}


















