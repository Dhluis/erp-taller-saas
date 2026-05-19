'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Refs for synchronous state — avoids stale closure bugs in start/stop
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false); // true during gap between start() call and onstart firing

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const lastProcessedIndexRef = useRef<number>(0);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const buildRecognition = useCallback((langVal: string, continuousVal: boolean, interimVal: boolean) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    console.log('🎙️ Inicializando SpeechRecognition...');
    const recognition = new SpeechRecognition();
    recognition.lang = langVal;
    recognition.continuous = continuousVal;
    recognition.interimResults = interimVal;

    recognition.onstart = () => {
      isListeningRef.current = true;
      isStartingRef.current = false;
      setIsListening(true);
      lastProcessedIndexRef.current = 0;
      console.log('🎙️ Microfono activo');
    };

    recognition.onresult = (event: any) => {
      let sessionFinalTranscript = '';
      let interimTranscript = '';
      let newFinalTranscript = '';

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
      if (newFinalTranscript && onResultRef.current) {
        onResultRef.current(newFinalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      const error = event.error;
      console.error('❌ Speech recognition error:', error);
      isListeningRef.current = false;
      isStartingRef.current = false;
      setIsListening(false);

      // "aborted" is an internal browser state error (e.g. start() called while already running)
      // It is not a user-facing problem — suppress it silently
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

  // Initialize once on mount; update params if lang/continuous/interimResults change
  useEffect(() => {
    const r = buildRecognition(lang, continuous, interimResults);
    if (r) recognitionRef.current = r;

    return () => {
      const cur = recognitionRef.current;
      if (cur) {
        cur.onstart = null;
        cur.onresult = null;
        cur.onerror = null;
        cur.onend = null;
        try { cur.abort(); } catch {}
        recognitionRef.current = null;
      }
      isListeningRef.current = false;
      isStartingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount/unmount only

  // Keep lang/continuous/interimResults in sync without rebuilding
  useEffect(() => {
    const r = recognitionRef.current;
    if (!r) return;
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = interimResults;
  }, [lang, continuous, interimResults]);

  const start = useCallback(() => {
    // Guard using refs — immune to stale React state closures
    if (isListeningRef.current || isStartingRef.current) {
      console.log('🎙️ Ya está activo o iniciando, ignorando');
      return;
    }

    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = buildRecognition(lang, continuous, interimResults);
      if (!recognition) return;
      recognitionRef.current = recognition;
    }

    isStartingRef.current = true;
    setTranscript('');
    lastProcessedIndexRef.current = 0;

    try {
      recognition.start();
      console.log('🎙️ Iniciando manualmente...');
    } catch (err: any) {
      isStartingRef.current = false;
      if (err.name === 'InvalidStateError') {
        // Browser considers it already started — sync our state
        console.log('🎙️ Ya estaba activo, sincronizando estado');
        isListeningRef.current = true;
        setIsListening(true);
      } else {
        console.error('🎙️ Error al iniciar:', err);
        // Recreate on catastrophic failure and retry once
        const fresh = buildRecognition(lang, continuous, interimResults);
        if (fresh) {
          recognitionRef.current = fresh;
          isStartingRef.current = true;
          try { fresh.start(); } catch { isStartingRef.current = false; }
        }
      }
    }
  }, [buildRecognition, lang, continuous, interimResults]);

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
