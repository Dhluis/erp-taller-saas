'use client';

import { useState, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: any) => void;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const {
    lang = 'es-MX',
    continuous = false,
    // false = solo resultados finales → comportamiento más estable en Safari
    interimResults = false,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Actualizar refs sin recrear callbacks
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  // Índice para continuous=true (evita re-emitir resultados ya procesados)
  const lastProcessedIndexRef = useRef<number>(0);

  const destroyCurrent = useCallback(() => {
    const cur = recognitionRef.current;
    if (!cur) return;
    cur.onstart = null;
    cur.onresult = null;
    cur.onerror = null;
    cur.onend = null;
    try { cur.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  const buildFresh = useCallback((langVal: string, continuousVal: boolean, interimVal: boolean) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = langVal;
    recognition.continuous = continuousVal;
    recognition.interimResults = interimVal;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      isStartingRef.current = false;
      setIsListening(true);
      lastProcessedIndexRef.current = 0;
      console.log('🎙️ Microfono activo');
    };

    recognition.onresult = (event: any) => {
      let newFinalText = '';
      let interimText = '';

      for (let i = lastProcessedIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        const seg = result[0].transcript;

        if (result.isFinal) {
          newFinalText += seg;
          lastProcessedIndexRef.current = i + 1;
        } else {
          interimText += seg;
        }
      }

      // Safari fallback: con continuous=false e interimResults=false Safari a veces
      // devuelve isFinal=false aunque el reconocimiento ya terminó. En ese caso
      // tomamos el último resultado como definitivo.
      if (!newFinalText && !continuousVal && !interimVal && event.results.length > 0) {
        const last = event.results[event.results.length - 1];
        newFinalText = last[0].transcript;
        lastProcessedIndexRef.current = event.results.length;
      }

      setTranscript(newFinalText || interimText);

      if (newFinalText.trim() && onResultRef.current) {
        onResultRef.current(newFinalText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      console.error('❌ Speech recognition error:', error);
      isListeningRef.current = false;
      isStartingRef.current = false;
      setIsListening(false);
      if (error === 'aborted') return;
      if (onErrorRef.current) onErrorRef.current(error);
    };

    recognition.onend = () => {
      console.log('🎙️ Reconocimiento terminado');
      isListeningRef.current = false;
      isStartingRef.current = false;
      setIsListening(false);
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (isListeningRef.current || isStartingRef.current) {
      console.log('🎙️ Ya está activo o iniciando, ignorando');
      return;
    }

    destroyCurrent();
    const recognition = buildFresh(lang, continuous, interimResults);
    if (!recognition) return;
    recognitionRef.current = recognition;

    isStartingRef.current = true;
    setTranscript('');
    lastProcessedIndexRef.current = 0;

    try {
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      console.error('🎙️ Error al iniciar:', err);
      destroyCurrent();
    }
  }, [buildFresh, destroyCurrent, lang, continuous, interimResults]);

  const stop = useCallback(() => {
    if (!isListeningRef.current && !isStartingRef.current) return;
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    start,
    stop,
    reset,
    isSupported: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
};
