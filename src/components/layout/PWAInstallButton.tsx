'use client';

import { useState } from 'react';
import { Download, Share, PlusSquare, Info, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface PWAInstallButtonProps {
  isCollapsed?: boolean
  variant?: 'sidebar' | 'topbar'
}

export function PWAInstallButton({ isCollapsed, variant = 'sidebar' }: PWAInstallButtonProps) {
  const { installState, isInstallable, isStandalone, isIOS, isManual, handleInstallClick, markAsInstalled } = usePWAInstall()
  const [showGuide, setShowGuide] = useState(false)

  // Si ya está instalada, no mostramos nada
  if (isStandalone) return null

  // Si no hay nada que mostrar, ocultar
  if (installState === 'hidden') return null

  const handleClick = () => {
    if (isInstallable) {
      // Tiene prompt nativo disponible — mostrar toast con botón de confirmación
      toast('🦅 ¡Instala Eagles System ERP!', {
        description: 'Acceso rápido desde tu pantalla de inicio con mejor rendimiento y modo offline.',
        action: {
          label: 'Instalar',
          onClick: () => handleInstallClick()
        },
        duration: 8000,
      });
    } else {
      // iOS o Android manual — abrir guía de pasos
      setShowGuide(true)
    }
  }

  const guideType = isIOS ? 'ios' : 'android'

  // ── Sidebar variant ──
  if (variant === 'sidebar') {
    return (
      <div className={cn("mt-4 px-2", isCollapsed ? "flex justify-center" : "")}>
        <Dialog open={showGuide} onOpenChange={setShowGuide}>
          <Button
            variant="outline"
            onClick={handleClick}
            className={cn(
              "w-full flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10 transition-all",
              isCollapsed ? "h-12 w-12 p-0 justify-center rounded-xl" : "h-10 justify-start"
            )}
            title="Instalar Eagles System ERP como aplicación"
          >
            <Download className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Instalar App</span>}
          </Button>
          <InstallGuideContent type={guideType} onClose={() => setShowGuide(false)} onInstalled={markAsInstalled} />
        </Dialog>
      </div>
    )
  }

  // ── TopBar variant ──
  return (
    <div className="flex items-center">
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="h-9 px-3 gap-2 flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-primary transition-colors border border-primary/20"
          title="Instalar Eagles System ERP como aplicación"
        >
          <Download className="h-4 w-4" />
          <span className="text-xs font-semibold hidden md:inline">Instalar App</span>
        </Button>
        <InstallGuideContent type={guideType} onClose={() => setShowGuide(false)} onInstalled={markAsInstalled} />
      </Dialog>
    </div>
  )
}

// ── Contenido del modal de guía, adaptado iOS vs Android ──
function InstallGuideContent({ type, onClose, onInstalled }: { type: 'ios' | 'android'; onClose: () => void; onInstalled: () => void }) {
  const isIOS = type === 'ios'

  const handleInstalled = () => {
    onInstalled()
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-primary">
          {isIOS ? <PlusSquare className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          {isIOS ? 'Instalar en iPhone / iPad' : 'Instalar en tu dispositivo'}
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          {isIOS
            ? 'Sigue estos pasos desde Safari para agregar Eagles System ERP a tu pantalla de inicio:'
            : 'Tu navegador no muestra el botón automático. Sigue estos pasos:'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-4">
        {isIOS ? (
          <>
            <Step number={1}>
              Abre esta página en <strong className="text-white">Safari</strong> (no en Chrome ni otro navegador).
            </Step>
            <Step number={2}>
              Pulsa el botón de <strong className="text-white">Compartir</strong>{' '}
              <Share className="inline h-4 w-4 mx-1 text-sky-400" /> en la barra inferior.
            </Step>
            <Step number={3}>
              Busca y pulsa <strong className="text-white">"Añadir a pantalla de inicio"</strong>{' '}
              <PlusSquare className="inline h-4 w-4 mx-1 text-sky-400" />.
            </Step>
          </>
        ) : (
          <>
            <Step number={1}>
              Abre el <strong className="text-white">menú del navegador</strong> (los tres puntos ⋮ en la esquina superior derecha).
            </Step>
            <Step number={2}>
              Busca la opción <strong className="text-white">"Instalar aplicación"</strong>,{' '}
              <strong className="text-white">"Agregar a pantalla de inicio"</strong> o similar.
            </Step>
            <Step number={3}>
              Sigue los pasos para confirmar la instalación.
            </Step>
          </>
        )}

        <div className="flex items-start gap-3 border-t border-slate-800 pt-4">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 italic">
            Una vez instalada, Eagles System ERP se abrirá como una app nativa con acceso rápido, carga instantánea y mejor experiencia en móvil.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold"
          onClick={handleInstalled}
        >
          ✅ Ya la instalé
        </Button>
        <Button
          variant="ghost"
          className="w-full text-slate-400 hover:text-white text-sm"
          onClick={onClose}
        >
          Cerrar
        </Button>
      </div>
    </DialogContent>
  )
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-primary/20 p-2 rounded-full text-primary font-bold w-8 h-8 flex items-center justify-center shrink-0 text-sm">
        {number}
      </div>
      <p className="text-sm text-slate-300">{children}</p>
    </div>
  )
}

