'use client'

import { useState } from 'react'
import { Crown, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBilling } from '@/hooks/useBilling'
import { cn } from '@/lib/utils'
import { HOTMART_CHECKOUT_URL as HOTMART_URL } from '@/lib/billing/hotmart'

export function TrialBanner() {
  const { isTrialActive, daysLeftInTrial, isLoading, plan } = useBilling()
  const [dismissed, setDismissed] = useState(false)

  if (isLoading) return null

  // Modo 1: Trial activo con cuenta regresiva
  if (isTrialActive && !dismissed) {
    const urgency =
      daysLeftInTrial <= 1 ? 'red' : daysLeftInTrial <= 3 ? 'orange' : 'amber'

    const containerStyles = {
      amber:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
      red:    'bg-red-500/10  border-red-500/20  text-red-300',
    }[urgency]

    const ctaStyles = {
      amber:  'bg-yellow-500 hover:bg-yellow-400 text-black',
      orange: 'bg-orange-500 hover:bg-orange-400 text-white',
      red:    'bg-red-500    hover:bg-red-400    text-white',
    }[urgency]

    const label =
      daysLeftInTrial <= 1
        ? 'Tu periodo de prueba vence hoy'
        : `${daysLeftInTrial} días de prueba restantes`

    return (
      <div className={cn(
        'flex items-center justify-between gap-2 px-3 sm:px-4',
        'h-10 border-b shrink-0',
        containerStyles
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Crown className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            className={cn('h-6 px-2.5 text-[11px] font-semibold rounded', ctaStyles)}
            asChild
          >
            <a href={HOTMART_URL} target="_blank" rel="noopener noreferrer">
              Actualizar plan
            </a>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="h-6 w-6 flex items-center justify-center rounded opacity-60 hover:opacity-100 hover:bg-white/10 transition-opacity"
            aria-label="Cerrar aviso"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    )
  }

  // Modo 2: Trial expirado sin pagar — banner persistente sin X
  const isExpiredTrial =
    plan?.trial_ends_at != null &&
    !isTrialActive &&
    plan?.subscription_status !== 'active'

  if (!isExpiredTrial) return null

  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-3 sm:px-4',
      'h-10 border-b shrink-0',
      'bg-red-500/10 border-red-500/20 text-red-300'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium truncate">
          Tu periodo de prueba ha terminado — estás en el plan Free
        </span>
      </div>
      <Button
        size="sm"
        className="h-6 px-2.5 text-[11px] font-semibold rounded bg-red-500 hover:bg-red-400 text-white shrink-0"
        asChild
      >
        <a href={HOTMART_URL} target="_blank" rel="noopener noreferrer">
          Actualizar plan
        </a>
      </Button>
    </div>
  )
}
