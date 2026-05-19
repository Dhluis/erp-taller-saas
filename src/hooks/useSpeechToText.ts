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

  // Refs para estado sincrónico — evita stale closures en start/stop
  const isListeningRef = useRef(false);
  // true durante la ventana entre start() y onstart (previene doble-llamada)
  const isStartingRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const lastProcessedIndexRef = useRef<number>(0);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Limpia y nulifica la instancia actual sin crear una nueva
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

  // Crea una instancia fresca con todos sus handlers
  const buildFresh = useCallback((langVal: string, continuousVal: boolean, interimVal: boolean) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

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

      // "aborted" es un error interno del browser — suprimir silenciosamente
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

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      destroyCurrent();
      isListeningRef.current = false;
      isStartingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    // Guard con refs — inmune a stale closures de React
    if (isListeningRef.current || isStartingRef.current) {
      console.log('🎙️ Ya está activo o iniciando, ignorando');
      return;
    }

    // Siempre crear instancia fresca para cada sesión:
    // reutilizar el mismo objeto entre start/stop puede acumular estado
    // interno en Chrome y degradar la calidad del reconocimiento
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
