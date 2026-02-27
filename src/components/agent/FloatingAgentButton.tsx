'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { AgentChatPanel } from './AgentChatPanel'

const FAVICON_SRC = '/eagles-logo-new.png'
const FAVICON_FALLBACK = '/favicon.svg'

/**
 * Botón flotante del agente de IA - Esquina inferior derecha.
 * Usa el mismo icono que el favicon (eagles-logo-new.png).
 */
export function FloatingAgentButton() {
  const [open, setOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState(FAVICON_SRC)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

      <AgentChatPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
