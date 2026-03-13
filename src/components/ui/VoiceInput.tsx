'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'ghost' | 'outline' | 'default';
  placeholder?: string;
  language?: string;
}

export function VoiceInput({
  onTranscript,
  className,
  size = 'icon',
  variant = 'ghost',
  language = 'es-MX'
}: VoiceInputProps) {
  const { isListening, transcript, start, stop, isSupported } = useSpeechToText({
    lang: language,
    onResult: (text) => {
      onTranscript(text);
    }
  });

  if (!isSupported) return null;

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={toggleListening}
      className={cn(
        "relative transition-all duration-200",
        isListening && "bg-red-500/10 text-red-500 hover:bg-red-500/20",
        className
      )}
      title={isListening ? "Detener dictado" : "Dictar con voz"}
    >
      {isListening ? (
        <div className="relative">
          <Mic className="w-4 h-4 animate-pulse fill-red-500/20" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </div>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}
