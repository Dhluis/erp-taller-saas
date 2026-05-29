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
    silenceTimeoutMs = 4000,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const isListeningRef   = useRef(false);
  const isStartingRef    = useRef(false);
  // true cuando el usuario presionó Stop explícitamente
  const userStoppedRef   = useRef(false);
  const onResultRef      = useRef(onResult);
  const onErrorRef       = useRef(onError);
  const lastProcessedIndexRef = useRef<number>(0);
  const pendingInterimRef     = useRef<string>('');
  const firedResultRef        = useRef<boolean>(false);
  const silenceTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Máximo absoluto de sesión para no dejar el mic abierto eternamente
  const maxSessionTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current  = onError;
  }, [onResult, onError]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  const clearMaxTimer = useCallback(() => {
    if (maxSessionTimerRef.current) { clearTimeout(maxSessionTimerRef.current); maxSessionTimerRef.current = null; }
  }, []);

  const destroyCurrent = useCallback(() => {
    clearSilenceTimer();
    clearMaxTimer();
    const cur = recognitionRef.current;
    if (!cur) return;
    cur.onstart  = null;
    cur.onresult = null;
    cur.onerror  = null;
    cur.onend    = null;
    try { cur.abort(); } catch {}
    recognitionRef.current = null;
  }, [clearSilenceTimer, clearMaxTimer]);

  const buildFresh = useCallback((
    langVal: string,
    continuousVal: boolean,
    interimVal: boolean,
    silenceMs: number,
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    // Safari solo tiene webkitSpeechRecognition; Chrome tiene ambos
    const isSafari =
      !!(window as any).webkitSpeechRecognition &&
      !(window as any).SpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang            = langVal;
    recognition.interimResults  = interimVal;
    recognition.maxAlternatives = 1;
    // Safari: forzar continuous=true; Chrome: usar el valor real
    recognition.continuous = isSafari ? true : continuousVal;

    const hardStop = () => {
      clearSilenceTimer();
      clearMaxTimer();
      userStoppedRef.current = true;
      try { recognition.stop(); } catch {}
    };

    recognition.onstart = () => {
      isListeningRef.current  = true;
      isStartingRef.current   = false;
      setIsListening(true);
      lastProcessedIndexRef.current = 0;
      pendingInterimRef.current     = '';
      firedResultRef.current        = false;
      console.log('🎙️ Microfono activo (Safari:', isSafari, ')');

      // Límite absoluto de 45 s para no dejar el mic abierto eternamente
      clearMaxTimer();
      maxSessionTimerRef.current = setTimeout(hardStop, 45000);
    };

    recognition.onresult = (event: any) => {
      // Reiniciar timer de silencio SOLO después de que el usuario habla
      if (isSafari) {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(hardStop, silenceMs);
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
      if (error === 'aborted') return;

      clearSilenceTimer();
      clearMaxTimer();
      isListeningRef.current  = false;
      isStartingRef.current   = false;
      userStoppedRef.current  = false;
      setIsListening(false);
      if (onErrorRef.current) onErrorRef.current(error);
    };

    recognition.onend = () => {
      console.log('🎙️ onend — userStopped:', userStoppedRef.current, 'firedResult:', firedResultRef.current);

      // ── Safari auto-restart ──────────────────────────────────────────────
      // Safari dispara onend espontáneamente aunque continuous=true.
      // Si el usuario NO paró manualmente y todavía NO recibimos resultado,
      // reiniciamos la misma instancia para seguir escuchando.
      if (
        isSafari &&
        !userStoppedRef.current &&
        isListeningRef.current &&
        !firedResultRef.current
      ) {
        console.log('🎙️ Safari: reiniciando reconocimiento...');
        try {
          recognition.start();
          return; // No cambiar estado — el mic sigue activo para el usuario
        } catch (e) {
          console.error('🎙️ Safari: error al reiniciar', e);
        }
      }
      // ────────────────────────────────────────────────────────────────────

      clearSilenceTimer();
      clearMaxTimer();
      isListeningRef.current  = false;
      isStartingRef.current   = false;
      userStoppedRef.current  = false;
      setIsListening(false);

      // Safari fallback: usar interim acumulado si nunca hubo isFinal=true
      if (!firedResultRef.current && pendingInterimRef.current.trim()) {
        console.log('🎙️ Safari fallback: usando interim como resultado final');
        if (onResultRef.current) onResultRef.current(pendingInterimRef.current.trim());
      }

      pendingInterimRef.current = '';
      firedResultRef.current    = false;
    };

    return recognition;
  }, [clearSilenceTimer, clearMaxTimer]);

  useEffect(() => {
    return () => {
      destroyCurrent();
      isListeningRef.current = false;
      isStartingRef.current  = false;
      userStoppedRef.current = false;
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

    userStoppedRef.current = false;
    isStartingRef.current  = true;
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
    clearMaxTimer();
    userStoppedRef.current = true;
    isStartingRef.current  = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, [clearSilenceTimer, clearMaxTimer]);

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
