'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('exclusicoparaclientes@gmail.com')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('🔍 [ForgotPassword] Iniciando reset para:', email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password-standalone`,
      })

      if (error) {
        console.error('❌ [ForgotPassword] Error:', error)
        setMessage(`❌ Error: ${error.message}`)
      } else {
        console.log('✅ [ForgotPassword] Email enviado exitosamente')
        setMessage('✅ ¡Enlace de recuperación enviado! Revisa tu correo.')
      }
    } catch (error: any) {
      console.error('💥 [ForgotPassword] Excepción:', error)
      setMessage(`💥 Error: ${error.message}`)
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
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem', 
            backgroundColor: '#fef3c7', 
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#92400e'
          }}>
            <strong>💡 Email válido:</strong> exclusicoparaclientes@gmail.com (ya precargado)
          </div>
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
            backgroundColor: message.includes('✅') ? '#f0fdf4' : '#fef2f2',
            color: message.includes('✅') ? '#166534' : '#dc2626',
            border: `1px solid ${message.includes('✅') ? '#bbf7d0' : '#fecaca'}`
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

        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <strong>Debug:</strong> Revisa la consola del navegador para ver los logs
        </div>
      </div>
    </div>
  )
}