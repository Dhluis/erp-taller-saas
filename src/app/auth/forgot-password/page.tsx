'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // ✅ Siempre enviar el reset sin validar existencia
      // Supabase Auth maneja esto de forma segura y solo envía email si existe
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      // ✅ Siempre mostrar el mismo mensaje genérico para no revelar si el email existe
      // Esto previene fuga de información sobre qué emails están registrados
      if (error) {
        console.error('❌ [ForgotPassword] Error:', error)
        // Aún así mostrar mensaje genérico para no revelar información
        setMessage('Si el email está registrado, recibirás un enlace de recuperación en tu correo.')
      } else {
        console.log('✅ [ForgotPassword] Solicitud procesada')
        // Mensaje genérico que no revela si el email existe o no
        setMessage('Si el email está registrado, recibirás un enlace de recuperación en tu correo.')
      }
    } catch (error: any) {
      console.error('💥 [ForgotPassword] Excepción:', error)
      // Mensaje genérico incluso en caso de excepción
      setMessage('Si el email está registrado, recibirás un enlace de recuperación en tu correo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f9fafb' 
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            📧 Recuperar Contraseña
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Ingresa tu email para recibir un enlace de recuperación
          </p>
        </div>

        <form onSubmit={handleResetPassword} style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#9ca3af' : '#2563eb',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ Enviando...' : '📧 Enviar Enlace de Recuperación'}
          </button>
        </form>

        {message && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '4px',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0'
          }}>
            {message}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <a 
            href="/auth/login" 
            style={{ 
              color: '#2563eb', 
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Volver al Login
          </a>
        </div>

      </div>
    </div>
  )
}