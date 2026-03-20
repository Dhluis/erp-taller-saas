'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface WorkOrderQRCodeProps {
  orderId: string
  orderNumber?: string
  customerName?: string
}

export function WorkOrderQRCode({ orderId, orderNumber, customerName }: WorkOrderQRCodeProps) {
  const [showQR, setShowQR] = useState(false)
  
  // URL de la página de seguimiento pública
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const trackingUrl = `${baseUrl}/tracking/${orderId}`
  
  // Mensaje para WhatsApp que el cliente enviará al escanear
  const whatsappMessage = encodeURIComponent(
    `Hola, soy ${customerName || 'un cliente'}, consulto por mi orden #${orderNumber || orderId.slice(0, 8).toUpperCase()}`
  )
  
  // Link de WhatsApp (puedes ajustar el número del taller si estuviera en la config)
  const whatsappLink = `https://wa.me/?text=${whatsappMessage}`

  return (
    <div className="flex flex-col gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 text-xs h-9 bg-bg-tertiary border-primary/20 hover:border-primary/50 text-text-primary transition-all shadow-sm"
        onClick={() => setShowQR(!showQR)}
      >
        <QrCode size={14} className="text-primary" />
        {showQR ? 'Ocultar QR' : 'Escanear Seguimiento'}
      </Button>

      {showQR && (
        <Card className="border-primary/20 bg-slate-900/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <CardContent className="p-4 flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl shadow-inner">
              <QRCodeSVG 
                value={trackingUrl} 
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Escanea para seguir</p>
              <p className="text-xs text-primary font-medium">Link para el cliente</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full gap-2 text-[10px] h-7 hover:bg-primary/10 hover:text-primary"
              onClick={() => window.open(trackingUrl, '_blank')}
            >
              <ExternalLink size={12} />
              Abrir vista cliente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
