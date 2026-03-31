'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
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
    continuous: true,
    onResult: (text) => {
      onTranscript(text);
      resetSilenceTimer();
    },
    onError: (error) => {
      console.error('🎙️ Error de voz:', error);
      if (error === 'not-allowed') {
        toast.error('Permiso de micrófono denegado');
      } else if (error === 'network') {
        toast.error('Error de red al procesar voz');
      } else {
        toast.error(`Error de dictado: ${error}`);
      }
    }
  });

  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (isListening) {
      silenceTimerRef.current = setTimeout(() => {
        console.log('🔇 Silencio detectado, deteniendo...');
        stop();
      }, 60000); // 60 segundos de tolerancia al silencio (antes 10)
    }
  };

  useEffect(() => {
    if (isListening) {
      resetSilenceTimer();
      toast.info('Escuchando...', { duration: 2000, id: 'voice-listening' });
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [isListening]);

  if (!isSupported) return null;

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (billingLoading) return;
    
    if (!canUseAI) {
      showUpgrade(AI_VOICE_LIMIT_ERROR);
      return;
    }

    if (isListening) {
      console.log('🎙️ Deteniendo manualmente...');
      stop();
    } else {
      console.log('🎙️ Iniciando manualmente...');
      start();
    }
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
          isListening && "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.3)]",
          !isListening && "hover:text-pink-400",
          className
        )}
        title={isListening ? "Detener dictado" : "Dictar con voz"}
        icon={
          isListening ? (
            <div className="relative">
              <Mic className="w-4 h-4 animate-pulse fill-pink-500/20" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
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
