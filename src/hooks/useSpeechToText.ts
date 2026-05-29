'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeoutMs?: number;
  onResult?: (transcript: string) => void;
  onError?: (error: any) => void;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}) => {
  const {
    lang = 'es-MX',
    continuous = false,
    interimResults = true,
    // Tiempo de silencio antes de parar automáticamente.
    // Con continuous=false en Chrome no aplica (para solo). En Safari (donde
    // continuous=true es necesario) este timer es el que dispara el stop().
    silenceTimeoutMs = 3000,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const isListeningRef   = useRef(false);
  const isStartingRef    = useRef(false);
  const onResultRef      = useRef(onResult);
  const onErrorRef       = useRef(onError);
  const lastProcessedIndexRef = useRef<number>(0);
  const pendingInterimRef     = useRef<string>('');
  const firedResultRef        = useRef<boolean>(false);
  const silenceTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current  = onError;
  }, [onResult, onError]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const destroyCurrent = useCallback(() => {
    clearSilenceTimer();
    const cur = recognitionRef.current;
    if (!cur) return;
    cur.onstart  = null;
    cur.onresult = null;
    cur.onerror  = null;
    cur.onend    = null;
    try { cur.abort(); } catch {}
    recognitionRef.current = null;
  }, [clearSilenceTimer]);

  const buildFresh = useCallback((
    langVal: string,
    continuousVal: boolean,
    interimVal: boolean,
    silenceMs: number,
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    // Detectar Safari (solo tiene webkitSpeechRecognition, Chrome tiene ambos)
    const isSafari =
      !!(window as any).webkitSpeechRecognition &&
      !(window as any).SpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = langVal;
    recognition.interimResults = interimVal;
    recognition.maxAlternatives = 1;

    // Safari con continuous=false dispara onend inmediatamente sin capturar nada.
    // Forzamos continuous=true y paramos manualmente con un timer de silencio.
    recognition.continuous = isSafari ? true : continuousVal;

    const stopAfterSilence = () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };

    recognition.onstart = () => {
      isListeningRef.current  = true;
      isStartingRef.current   = false;
      setIsListening(true);
      lastProcessedIndexRef.current = 0;
      pendingInterimRef.current     = '';
      firedResultRef.current        = false;
      console.log('🎙️ Microfono activo');

      // Safari: arrancar timer de silencio desde el inicio
      if (isSafari) {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(stopAfterSilence, silenceMs);
      }
    };

    recognition.onresult = (event: any) => {
      // Cualquier resultado (interim o final) reinicia el timer de silencio
      if (isSafari) {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(stopAfterSilence, silenceMs);
      }

      let sessionFinalTranscript = '';
      let interimTranscript      = '';
      let newFinalTranscript     = '';

      for (let i = 0; i < event.results.length; i++) {
        const seg = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinalTranscript += seg;
          if (i >= lastProcessedIndexRef.current) {
            newFinalTranscript += seg;
            lastProcessedIndexRef.current = i + 1;
          }
        } else {
          interimTranscript += seg;
        }
      }

      setTranscript(sessionFinalTranscript + interimTranscript);

      // Guardar interim para el fallback de Safari en onend
      if (interimTranscript) pendingInterimRef.current = interimTranscript;

      if (newFinalTranscript) {
        firedResultRef.current    = true;
        pendingInterimRef.current = '';
        if (onResultRef.current) onResultRef.current(newFinalTranscript);

        // Chrome con continuous=false: parar tras primer resultado final
        if (!continuousVal && !isSafari) {
          clearSilenceTimer();
          try { recognition.stop(); } catch {}
        }
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      console.error('❌ Speech recognition error:', error);
      clearSilenceTimer();
      isListeningRef.current  = false;
      isStartingRef.current   = false;
      setIsListening(false);
      if (error === 'aborted') return;
      if (onErrorRef.current) onErrorRef.current(error);
    };

    recognition.onend = () => {
      console.log('🎙️ Reconocimiento terminado');
      clearSilenceTimer();
      isListeningRef.current  = false;
      isStartingRef.current   = false;
      setIsListening(false);

      // Safari fallback: nunca pone isFinal=true pero acumula interim.
      // Cuando para (por timer o por stop manual), usamos ese texto.
      if (!firedResultRef.current && pendingInterimRef.current.trim()) {
        console.log('🎙️ Safari fallback: usando interim como resultado final');
        if (onResultRef.current) onResultRef.current(pendingInterimRef.current.trim());
      }

      pendingInterimRef.current = '';
      firedResultRef.current    = false;
    };

    return recognition;
  }, [clearSilenceTimer]);

  useEffect(() => {
    return () => {
      destroyCurrent();
      isListeningRef.current = false;
      isStartingRef.current  = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (isListeningRef.current || isStartingRef.current) {
      console.log('🎙️ Ya está activo o iniciando, ignorando');
      return;
    }

    destroyCurrent();
    const recognition = buildFresh(lang, continuous, interimResults, silenceTimeoutMs);
    if (!recognition) return;
    recognitionRef.current = recognition;

    isStartingRef.current = true;
    setTranscript('');
    lastProcessedIndexRef.current = 0;

    try {
      recognition.start();
      console.log('🎙️ Iniciando manualmente...');
    } catch (err: any) {
      isStartingRef.current = false;
      console.error('🎙️ Error al iniciar:', err);
      destroyCurrent();
    }
  }, [buildFresh, destroyCurrent, lang, continuous, interimResults, silenceTimeoutMs]);

  const stop = useCallback(() => {
    if (!isListeningRef.current && !isStartingRef.current) return;
    clearSilenceTimer();
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, [clearSilenceTimer]);

  const reset = useCallback(() => setTranscript(''), []);

  return {
    isListening,
    transcript,
    start,
    stop,
    reset,
    isSupported:
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
};
