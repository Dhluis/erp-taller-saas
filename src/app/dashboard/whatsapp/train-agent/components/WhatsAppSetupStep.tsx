'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wifi } from 'lucide-react'

interface WhatsAppSetupStepProps {
  data?: Record<string, unknown>
  onChange?: () => void
}

export function WhatsAppSetupStep({ onChange }: WhatsAppSetupStepProps) {
  useEffect(() => {
    onChange?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Conecta tu WhatsApp Business
        </CardTitle>
        <CardDescription>
          Conecta tu WhatsApp Business de forma sencilla y sin configuración adicional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          La conexión se configurará automáticamente. No necesitas configurar nada adicional.
        </p>
      </CardContent>
    </Card>
  )
}

