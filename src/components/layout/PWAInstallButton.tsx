'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface PWAInstallButtonProps {
  isCollapsed?: boolean
  variant?: 'sidebar' | 'topbar'
}

export function PWAInstallButton({ isCollapsed, variant = 'sidebar' }: PWAInstallButtonProps) {
  const { isInstallable, isStandalone, handleInstallClick } = usePWAInstall()
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)
  }, [])

  // Si ya es standalone (instalado), no mostramos nada
  if (isStandalone) return null

  // En Android/PC, si aún no es capturado el evento, no mostramos nada (hasta que sea instalable)
  // Pero en iOS, siempre mostramos el botón de guía ya que no hay evento nativo
  if (!isInstallable && !isIOS) return null

  const handleClick = () => {
    if (isIOS) {
      setShowIOSGuide(true)
    } else {
      handleInstallClick()
    }
  }

  // Renderizado para Sidebar
  if (variant === 'sidebar') {
    return (
      <div className={cn("mt-4 px-2", isCollapsed ? "flex justify-center" : "")}>
        <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
          <Button
            variant="outline"
            onClick={handleClick}
            className={cn(
              "w-full flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10 transition-all",
              isCollapsed ? "h-12 w-12 p-0 justify-center rounded-xl" : "h-10 justify-start"
            )}
            title="Instalar Aplicación"
          >
            <Download className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Instalar App</span>}
          </Button>
          {/* Guía modal compartida */}
          <IOSGuideContent onClose={() => setShowIOSGuide(false)} />
        </Dialog>
      </div>
    )
  }

  // Renderizado para TopBar
  return (
    <div className="flex items-center">
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="h-9 w-9 p-0 flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-primary transition-colors border border-primary/20"
          title="Instalar App"
        >
          <Download className="h-4.5 w-4.5" />
        </Button>
        <IOSGuideContent onClose={() => setShowIOSGuide(false)} />
      </Dialog>
    </div>
  )
}

function IOSGuideContent({ onClose }: { onClose: () => void }) {
  return (
    <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          <PlusSquare className="h-5 w-5" />
          Instalar en tu iPhone
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          Sigue estos pasos para tener el ERP en tu pantalla de inicio:
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 p-2 rounded-full text-primary font-bold w-8 h-8 flex items-center justify-center shrink-0">
            1
          </div>
          <p className="text-sm">
            Pulsa el botón de **"Compartir"** <Share className="inline h-4 w-4 mx-1 text-sky-400" /> en la barra inferior de Safari.
          </p>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 p-2 rounded-full text-primary font-bold w-8 h-8 flex items-center justify-center shrink-0">
            2
          </div>
          <p className="text-sm">
            Busca y pulsa la opción **"Añadir a la pantalla de inicio"** <PlusSquare className="inline h-4 w-4 mx-1 text-sky-400" />.
          </p>
        </div>

        <div className="flex items-start gap-4 border-t border-slate-800 pt-4">
          <Info className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-xs text-slate-500 italic">
            Esto te permitirá usar el sistema como una aplicación real, con más espacio y acceso rápido.
          </p>
        </div>
      </div>
      
      <Button 
        className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold" 
        onClick={onClose}
      >
        ¡Entendido!
      </Button>
    </DialogContent>
  )
}
