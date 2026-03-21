'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Send, RefreshCw, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LeadAIActionButtonProps {
  leadId: string
  leadPhone: string
  organizationId: string
  onMessageSent?: () => void
  className?: string
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function LeadAIActionButton({ 
  leadId, 
  leadPhone, 
  organizationId,
  onMessageSent,
  className,
  variant = 'outline',
  size = 'default'
}: LeadAIActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftedMessage, setDraftedMessage] = useState('')
  const [manualPhone, setManualPhone] = useState(leadPhone || '')
  
  // Update phone state if prop changes
  useState(() => {
    setManualPhone(leadPhone || '')
  })

  const generateMessage = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'draft-lead-message',
          payload: {
            leadId,
            organizationId
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al generar el borrador')
      }

      setDraftedMessage(result.message)
      if (!isOpen) setIsOpen(true)
      toast.success('Borrador generado con IA')
    } catch (error: any) {
      console.error('Error in LeadAIActionButton:', error)
      toast.error(error.message || 'Hubo un error al generar el borrador')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendToWhatsApp = () => {
    if (!draftedMessage) {
      toast.error('Garantiza tener un mensaje antes de enviar')
      return
    }

    if (!manualPhone) {
      toast.error('Necesitas un número de teléfono válido')
      return
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanedPhone = manualPhone.replace(/\D/g, '')

    // Encode message for URL
    const encodedMessage = encodeURIComponent(draftedMessage)

    // Open WhatsApp locally (mobile app or web depending on device)
    window.open(`https://wa.me/${cleanedPhone}?text=${encodedMessage}`, '_blank')
    toast.success('Abriendo WhatsApp...')
    setIsOpen(false)
    if (onMessageSent) onMessageSent()
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          generateMessage()
        }}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Generar Seguimiento IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              Borrador de Seguimiento
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Mensaje con IA</label>
              <Textarea
                value={draftedMessage}
                onChange={(e) => setDraftedMessage(e.target.value)}
                className="col-span-3 min-h-[150px] bg-slate-800 border-slate-700 focus:border-blue-500"
                placeholder="El borrador generado aparecerá aquí..."
              />
              <p className="text-xs text-slate-500 text-right mt-1">
                Puedes editar el mensaje libremente antes de enviar.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Número de destino (WhatsApp)</label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="ej. 5212345678"
                className="bg-slate-800 border-slate-700 focus:border-green-500"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-row sm:justify-between sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateMessage}
                disabled={isGenerating}
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Re-generar
              </Button>
              <Button
                onClick={handleSendToWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isGenerating || !draftedMessage || !manualPhone}
              >
                <Send className="mr-2 h-4 w-4" />
                Continuar a WhatsApp
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
