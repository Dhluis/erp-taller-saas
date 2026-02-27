'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { AgentChatPanel } from './AgentChatPanel'
import { useBilling } from '@/hooks/useBilling'
import { useLimitCheck } from '@/hooks/useLimitCheck'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import type { LimitError } from '@/types/billing'

const FAVICON_SRC = '/eagles-logo-new.png'
const FAVICON_FALLBACK = '/favicon.svg'

const AI_AGENT_LIMIT_ERROR: LimitError = {
  type: 'limit_exceeded',
  resource: 'work_order',
  message: 'El Asistente de IA está disponible solo en el plan Premium. Actualiza para consultar órdenes, clientes, inventario y finanzas con lenguaje natural.',
  feature: 'ai_enabled',
  upgrade_url: '/settings/billing',
  plan_required: 'premium',
}

/**
 * Botón flotante del agente de IA - Esquina inferior derecha.
 * Solo visible/utilizable para planes Premium (o trial). Free ve modal de upgrade.
 */
export function FloatingAgentButton() {
  const [open, setOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState(FAVICON_SRC)
  const { canUseAI, isLoading: billingLoading } = useBilling()
  const { showUpgradeModal, closeUpgradeModal, showUpgrade, limitError } = useLimitCheck()

  const handleOpenAgent = () => {
    if (billingLoading) return
    if (!canUseAI) {
      showUpgrade(AI_AGENT_LIMIT_ERROR)
      return
    }
    setOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (billingLoading) return
        if (!canUseAI) showUpgrade(AI_AGENT_LIMIT_ERROR)
        else setOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUseAI, billingLoading, showUpgrade])

  return (
    <>
      <button
        type="button"
        onClick={handleOpenAgent}
        aria-label="Abrir asistente de IA"
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-slate-900/90 backdrop-blur-md border border-cyan-500/50',
          'shadow-[0_0_24px_rgba(0,217,255,0.25)]',
          'hover:shadow-[0_0_32px_rgba(0,217,255,0.4)] hover:border-cyan-400/60',
          'active:scale-95 transition-all duration-200',
          'ring-2 ring-cyan-500/20 ring-offset-2 ring-offset-bg-primary'
        )}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent" />
        <span className="relative w-8 h-8 flex items-center justify-center overflow-hidden rounded-full">
          <Image
            src={imgSrc}
            alt="EAGLES Asistente"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            unoptimized
            onError={() => setImgSrc(FAVICON_FALLBACK)}
          />
        </span>
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/60 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
        </span>
      </button>

      <AgentChatPanel
        open={open}
        onOpenChange={setOpen}
        onLimitReached={(err) => showUpgrade({
          type: 'limit_exceeded',
          resource: 'work_order',
          message: err.message,
          feature: err.feature || 'ai_enabled',
          upgrade_url: err.upgrade_url || '/settings/billing',
          plan_required: 'premium',
        })}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
        featureName="Asistente de IA"
      />
    </>
  )
}
