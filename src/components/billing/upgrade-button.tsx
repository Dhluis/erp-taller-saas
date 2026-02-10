'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Crown } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface UpgradeButtonProps {
  plan: 'monthly' | 'annual'
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function UpgradeButton({ plan, variant = 'default', size = 'default', className }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      // 1. Crear Checkout Session
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear sesión de pago')
      }

      const { url } = await response.json()

      if (!url) {
        throw new Error('No se recibió URL de checkout')
      }

      // 2. Redirigir a Stripe Checkout
      window.location.href = url
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo procesar el pago'
      console.error('Error al procesar upgrade:', error)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const isOutline = variant === 'outline'

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      variant={isOutline ? 'outline' : 'primary'}
      size={size}
      className={cn(
        'transition-transform duration-200 hover:scale-[1.03]',
        !isOutline && 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white border-0 shadow-sm',
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <Crown className="mr-2 h-4 w-4" />
          {plan === 'annual' ? 'Suscribirse (Anual)' : 'Suscribirse (Mensual)'}
        </>
      )}
    </Button>
  )
}
