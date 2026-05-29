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
    // true es necesario para que Safari mantenga el micrófono abierto.
    // Con false, webkitSpeechRecognition dispara onend inmediatamente.
    interimResults = true,
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
  const lastProcessedIndexRef = useRef<number>(0);

  // Acumula texto interim para el fallback de Safari
  const pendingInterimRef = useRef<string>('');
  // True si ya se disparó onResult al menos una vez en esta sesión
  const firedResultRef = useRef<boolean>(false);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

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
      pendingInterimRef.current = '';
      firedResultRef.current = false;
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

      // Guardar interim para Safari: si onend llega sin isFinal, lo usamos ahí
      if (interimTranscript) {
        pendingInterimRef.current = interimTranscript;
      }

      if (newFinalTranscript) {
        firedResultRef.current = true;
        pendingInterimRef.current = '';
        if (onResultRef.current) onResultRef.current(newFinalTranscript);
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

      // Safari fallback: webkitSpeechRecognition nunca pone isFinal=true
      // pero acumula el texto en resultados interim. Lo disparamos en onend.
      if (!firedResultRef.current && pendingInterimRef.current.trim()) {
        console.log('🎙️ Safari fallback: usando interim como resultado final');
        if (onResultRef.current) onResultRef.current(pendingInterimRef.current.trim());
      }

      pendingInterimRef.current = '';
      firedResultRef.current = false;
    };

    return recognition;
  }, []);

  useEffect(() => {
    return () => {
      destroyCurrent();
      isListeningRef.current = false;
      isStartingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log('🎙️ Iniciando manualmente...');
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
