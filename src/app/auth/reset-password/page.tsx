'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [tokenVerified, setTokenVerified] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyToken = async () => {
      console.log('🔍 [ResetPassword] Verificando token...')
      console.log('🔍 [ResetPassword] URL completa:', window.location.href)
      console.log('🔍 [ResetPassword] Search params:', Object.fromEntries(searchParams.entries()))
      
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      // Si tenemos access_token y refresh_token, usar esos en lugar de verifyOtp
      if (accessToken && refreshToken) {
        console.log('🔍 [ResetPassword] Usando access_token y refresh_token')
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setError('Token inválido o expirado')
            console.error('Error estableciendo sesión:', error)
          } else {
            setTokenVerified(true)
            console.log('✅ Sesión establecida correctamente')
          }
        } catch (error: any) {
          setError('Error al establecer sesión')
          console.error('Excepción estableciendo sesión:', error)
        } finally {
          setVerifying(false)
        }
        return
      }

      // Método alternativo con verifyOtp
      if (!tokenHash || type !== 'recovery') {
        setError('Token inválido o expirado')
        setVerifying(false)
        return
      }

      try {
        // Verificar el token de recovery
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (error) {
          setError('Token inválido o expirado')
          console.error('Error verificando token:', error)
        } else {
          setTokenVerified(true)
          console.log('✅ Token verificado correctamente')
        }
      } catch (error: any) {
        setError('Error al verificar token')
        console.error('Excepción verificando token:', error)
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      // Actualizar la contraseña del usuario autenticado
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      console.log('✅ Contraseña actualizada exitosamente')
      
      // Cerrar sesión para que inicie sesión con nueva contraseña
      await supabase.auth.signOut()
      
      // Redirigir al login con mensaje de éxito
      router.push('/auth/login?message=password_updated')
    } catch (error: any) {
      setError(error.message || 'Error al actualizar contraseña')
      console.error('Error actualizando contraseña:', error)
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Verificando token...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!tokenVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Token Inválido</h1>
          <p className="text-gray-600 mb-6">{error || 'El enlace de recuperación es inválido o ha expirado.'}</p>
          <Button onClick={() => router.push('/auth/login')} className="w-full">
            Volver al Login
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Establecer Nueva Contraseña</h1>
        
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Repite la contraseña"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Actualizando...' : 'Establecer Contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  )
}