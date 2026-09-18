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

// Detección única de Safari/WebKit — compartida por este hook y VoiceInput.tsx.
// Antes había dos detecciones separadas (una por UA, otra por feature-detection)
// que se desincronizaron cuando Safari 17+ empezó a exponer `window.SpeechRecognition`
// sin prefijo: la de feature-detection quedó invertida y dejó de activar el flujo
// especial de iOS. Mantener una sola fuente de verdad evita que vuelva a pasar.
export const isSafariBrowser = (): boolean => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS/i.test(ua);
};

// Detección de iOS que también cubre iPad en modo "Solicitar sitio de escritorio"
// (activado por defecto desde iPadOS 13): en ese modo el UA dice "Macintosh" igual
// que un Mac real, así que un simple /ipad/i.test(ua) no lo detecta. Un Mac real
// nunca tiene puntos de contacto; un iPad sí.
export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
};

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
  const isStandaloneRef       = useRef(false); // PWA standalone (home screen)
  const isAutoRestartingRef   = useRef(false); // Safari auto-restart en curso
  const restartCountRef       = useRef(0);     // Reinicios consecutivos sin speech (Safari)

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current  = onError;
  }, [onResult, onError]);

  // Detectar modo standalone (PWA) una sola vez al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isStandaloneRef.current =
        window.matchMedia('(display-mode: standalone)').matches ||
        !!(window.navigator as any).standalone;
    }
  }, []);

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

    const isSafari = isSafariBrowser();

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
      restartCountRef.current = 0; // El usuario habló — reiniciar contador de reinicios
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

      // Safari: errores de red son transitorios — no cancelar estado para que onend pueda reiniciar
      if (isSafari && error === 'network' && isListeningRef.current && !userStoppedRef.current) {
        console.log('🎙️ Safari: error de red transitorio, onend intentará restart');
        return;
      }

      clearSilenceTimer();
      clearMaxTimer();
      isListeningRef.current  = false;
      isStartingRef.current   = false;
      userStoppedRef.current  = false;
      setIsListening(false);

      // Si el error ocurrió durante un auto-restart (no por acción del usuario)
      // silenciar service-not-allowed para no mostrar toast espurio
      const wasAutoRestarting = isAutoRestartingRef.current;
      isAutoRestartingRef.current = false;
      if (wasAutoRestarting && (error === 'service-not-allowed' || error === 'not-allowed')) {
        console.log('🎙️ Auto-restart bloqueado por Safari — deteniendo silenciosamente');
        return;
      }

      // Safari lanza 'service-not-allowed' y 'audio-capture' como variantes de 'not-allowed'
      const normalized =
        (error === 'service-not-allowed' || error === 'audio-capture') ? 'not-allowed' : error;
      if (onErrorRef.current) onErrorRef.current(normalized);
    };

    recognition.onend = () => {
      console.log('🎙️ onend — userStopped:', userStoppedRef.current, 'firedResult:', firedResultRef.current);

      // ── Safari auto-restart ──────────────────────────────────────────────
      // Safari dispara onend espontáneamente aunque continuous=true.
      // Con getUserMedia ya resuelto (permiso concedido), el restart desde onend
      // funciona tanto en browser como en PWA standalone — no requiere nuevo gesto.
      // Límite de 8 reinicios consecutivos sin speech para evitar loops infinitos.
      if (
        isSafari &&
        !userStoppedRef.current &&
        isListeningRef.current &&
        !firedResultRef.current &&
        restartCountRef.current < 8
      ) {
        restartCountRef.current++;
        console.log('🎙️ Safari: reiniciando reconocimiento (intento', restartCountRef.current, ')...');
        isAutoRestartingRef.current = true;
        try {
          recognition.start();
          return; // No cambiar estado — el mic sigue activo para el usuario
        } catch (e) {
          isAutoRestartingRef.current = false;
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

    restartCountRef.current = 0; // Sesión nueva — reiniciar contador
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
      // Antes este error se tragaba en silencio (solo console.error) — el usuario
      // no tenía forma de saber que el dictado no arrancó. Lo propagamos para
      // que la UI pueda avisar en vez de quedar "muerta" sin feedback.
      if (onErrorRef.current) onErrorRef.current(err?.name === 'InvalidStateError' ? 'aborted' : 'start-failed');
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
