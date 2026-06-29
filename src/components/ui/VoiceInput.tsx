'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Lock } from 'lucide-react';
import { IconButton } from '@/components/ui/button';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBilling } from '@/hooks/useBilling';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { UpgradeModal } from '@/components/billing/upgrade-modal';

const AI_VOICE_LIMIT_ERROR = {
  type: 'limit_exceeded' as const,
  resource: 'work_order' as const,
  message: 'El dictado por voz con IA es una función Premium. Optimiza tu tiempo convirtiendo voz en texto al instante.',
  feature: 'ai_enabled',
  upgrade_url: '/settings/billing',
  plan_required: 'premium' as const,
};

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  placeholder?: string;
  language?: string;
}

export function VoiceInput({
  onTranscript,
  className,
  size = 'md',
  variant = 'ghost',
  language = 'es-MX'
}: VoiceInputProps) {
  const { canUseAI, isLoading: billingLoading } = useBilling();
  const { showUpgradeModal, closeUpgradeModal, showUpgrade, limitError } = useLimitCheck();

  const { isListening, transcript, start, stop, isSupported } = useSpeechToText({
    lang: language,
    continuous: false,
    onResult: (text) => {
      onTranscript(text);
    },
    onError: (error) => {
      console.error('🎙️ Error de voz:', error);
      if (error === 'not-allowed') {
        const isIOS =
          typeof navigator !== 'undefined' &&
          /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (isIOS) {
          toast.error(
            'Sin acceso al micrófono. Ve a Ajustes > Eagles ERP (o Safari) > Micrófono y actívalo.',
            { duration: 7000 }
          );
        } else {
          toast.error('Permiso de micrófono denegado. Habilítalo en Configuración > Privacidad > Micrófono.');
        }
      } else if (error === 'network') {
        toast.error('Error de red al procesar voz. Verifica tu conexión.');
      } else if (error !== 'aborted' && error !== 'no-speech') {
        toast.error(`Error de dictado: ${error}`);
      }
    }
  });

  useEffect(() => {
    if (isListening) {
      toast.info('Escuchando... habla ahora', { duration: 2500, id: 'voice-listening' });
    }
  }, [isListening]);

  if (!isSupported) return null;

  const isLocked = !billingLoading && !canUseAI;

  const toggleListening = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (billingLoading) return;
    if (isLocked) { showUpgrade(AI_VOICE_LIMIT_ERROR); return; }

    if (isListening) {
      console.log('🎙️ Deteniendo manualmente...');
      stop();
      return;
    }

    // iOS Safari: webkitSpeechRecognition.start() requiere un user gesture.
    // Llamamos getUserMedia() primero (también requiere gesto); iOS 14.5+ propaga
    // el contexto del gesto a través de la cadena de microtasks (.then / await),
    // por lo que start() llamado después hereda ese contexto.
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const hasSafariSR =
      typeof window !== 'undefined' &&
      !!(window as any).webkitSpeechRecognition &&
      !(window as any).SpeechRecognition;

    if (isIOS && hasSafariSR) {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          console.log('🎙️ iOS Safari: solicitando permiso de mic...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop()); // liberar — solo necesitamos el permiso
          console.log('🎙️ iOS Safari: permiso OK → iniciando SR');
          start(); // síncrono dentro de la cadena de microtasks del gesto original
        } catch (err: any) {
          const errName = (err?.name ?? '') as string;
          console.error('🎙️ iOS getUserMedia error:', errName);
          const isStandalone =
            typeof window !== 'undefined' &&
            (window.matchMedia('(display-mode: standalone)').matches ||
             !!(window.navigator as any).standalone);
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errName === 'SecurityError') {
            if (isStandalone) {
              toast.error(
                'Micrófono bloqueado. Ve a Ajustes del iPhone > Eagles ERP > activa "Micrófono", luego intenta de nuevo.',
                { duration: 10000 }
              );
            } else {
              toast.error(
                'Toca "Permitir" cuando Safari solicite acceso al micrófono y vuelve a intentar.',
                { duration: 6000 }
              );
            }
          } else {
            toast.error('No se pudo acceder al micrófono. Intenta de nuevo.');
          }
        }
      } else {
        // getUserMedia no disponible — intentar SR directamente
        start();
      }
      return;
    }

    // Todos los demás navegadores: iniciar directamente dentro del gesto
    console.log('🎙️ Iniciando manualmente...');
    start();
  };

  return (
    <>
      <IconButton
        type="button"
        size={size}
        variant={variant}
        onClick={toggleListening}
        className={cn(
          "relative transition-all duration-200",
          isListening && "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
          isLocked && "opacity-50 cursor-pointer",
          !isListening && !isLocked && "hover:text-amber-400",
          className
        )}
        title={
          isLocked
            ? "Dictado por voz — función Premium"
            : isListening
            ? "Detener dictado"
            : "Dictar con voz"
        }
        icon={
          isListening ? (
            <div className="relative">
              <Mic className="w-4 h-4 animate-pulse fill-amber-400/30" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
          ) : isLocked ? (
            <div className="relative">
              <Mic className="w-4 h-4 text-slate-500" />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500">
                <Lock className="w-1.5 h-1.5 text-white" />
              </span>
            </div>
          ) : (
            <Mic className="w-4 h-4" />
          )
        }
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
        featureName="Dictado por Voz IA"
      />
    </>
  );
}
