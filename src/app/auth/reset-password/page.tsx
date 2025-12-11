'use client'

// Disable static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isValidToken, setIsValidToken] = useState(false)

  // Verificar token de recuperación en la URL o hash
  useEffect(() => {
    const checkRecoveryToken = async () => {
      const supabase = createClient()
      
      // Verificar si hay token_hash en query params (viene del callback)
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      
      // También verificar hash en la URL (formato estándar de Supabase)
      let hashParams: URLSearchParams | null = null
      if (typeof window !== 'undefined' && window.location.hash) {
        hashParams = new URLSearchParams(window.location.hash.substring(1))
      }
      
      const hashType = hashParams?.get('type')
      const hashToken = hashParams?.get('access_token') || hashParams?.get('token_hash')
      
      // Si hay token de recuperación, verificar que sea válido
      if ((type === 'recovery' && tokenHash) || hashType === 'recovery') {
        try {
          // Verificar sesión actual (el callback ya debería haber establecido la sesión)
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error || !session) {
            console.error('❌ [ResetPassword] No hay sesión válida:', error)
            toast.error('El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.')
            setTimeout(() => {
              router.push('/auth/forgot-password')
            }, 2000)
            return
          }
          
          setIsValidToken(true)
          console.log('✅ [ResetPassword] Token de recuperación válido')
        } catch (error: any) {
          console.error('❌ [ResetPassword] Error verificando token:', error)
          toast.error('Error al verificar el enlace. Intenta de nuevo.')
          setTimeout(() => {
            router.push('/auth/forgot-password')
          }, 2000)
        }
      } else {
        // Si no hay token de recuperación, verificar si hay error
        const error = searchParams.get('error')
        const errorCode = searchParams.get('error_code')
        
        if (error === 'access_denied' && errorCode === 'otp_expired') {
          toast.error('El enlace ha expirado. Solicita uno nuevo.')
        } else if (error) {
          toast.error('Error al verificar el enlace. Intenta de nuevo.')
        } else {
          // Si no hay token ni error, probablemente el usuario llegó aquí directamente
          // Permitir que intente cambiar la contraseña si tiene sesión activa
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidToken(true)
          } else {
            toast.error('No hay sesión activa. Solicita un nuevo enlace de recuperación.')
            setTimeout(() => {
              router.push('/auth/forgot-password')
            }, 2000)
          }
        }
      }
    }
    
    checkRecoveryToken()
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!password || !confirmPassword) {
      toast.error('Por favor completa todos los campos')
      return
    }

    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Verificar que hay una sesión válida antes de actualizar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ [ResetPassword] No hay sesión válida:', sessionError)
        toast.error('La sesión ha expirado. Solicita un nuevo enlace de recuperación.')
        setTimeout(() => {
          router.push('/auth/forgot-password')
        }, 2000)
        setLoading(false)
        return
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('❌ [ResetPassword] Error updating password:', error)
        toast.error(error.message || 'Error al actualizar la contraseña')
        setLoading(false)
        return
      }

      console.log('✅ [ResetPassword] Contraseña actualizada exitosamente')
      toast.success('Contraseña actualizada exitosamente')
      
      // Cerrar sesión para forzar nuevo login con la nueva contraseña
      await supabase.auth.signOut()
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)

    } catch (error: any) {
      console.error('❌ [ResetPassword] Excepción:', error)
      toast.error('Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Restablecer Contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nueva Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Indicador de fortaleza */}
            {password && (
              <div className="text-xs text-muted-foreground">
                {password.length < 8 && '⚠️ Debe tener al menos 8 caracteres'}
                {password.length >= 8 && password.length < 12 && '✅ Buena'}
                {password.length >= 12 && '🔒 Excelente'}
              </div>
            )}
            
            {/* Mensaje si no hay token válido */}
            {!isValidToken && (
              <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-600 px-4 py-2 rounded-lg text-sm">
                Verificando enlace de recuperación...
              </div>
            )}

            {/* Botón Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </Button>

            {/* Link volver al login */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => router.push('/auth/login')}
                disabled={loading}
                className="text-sm"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}









