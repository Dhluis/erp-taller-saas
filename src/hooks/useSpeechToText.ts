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
  
  // Guardar callbacks en refs para que el useEffect no los necesite como dependencia
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const lastProcessedIndexRef = useRef<number>(0);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return null;
    }

    console.log('🎙️ Inicializando SpeechRecognition...');
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      lastProcessedIndexRef.current = 0; // Reiniciar contador en cada inicio
      console.log('🎙️ Microfono activo');
    };

    recognition.onresult = (event: any) => {
      let sessionFinalTranscript = '';
      let interimTranscript = '';
      let newFinalTranscript = '';
      
      // Iterar sobre todos los resultados desde el inicio para construir el estado completo
      for (let i = 0; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinalTranscript += transcriptSegment;
          
          // Solo emitir fragmentos finales que no hayamos procesado aún
          if (i >= lastProcessedIndexRef.current) {
            newFinalTranscript += transcriptSegment;
            lastProcessedIndexRef.current = i + 1;
          }
        } else {
          interimTranscript += transcriptSegment;
        }
      }
      
      const currentTranscript = sessionFinalTranscript + interimTranscript;
      setTranscript(currentTranscript);
      
      if (newFinalTranscript && onResultRef.current) {
        onResultRef.current(newFinalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      if (onErrorRef.current) {
        onErrorRef.current(event.error);
      }
    };

    recognition.onend = () => {
      console.log('🎙️ Reconocimiento terminado');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [lang, continuous, interimResults]);

  useEffect(() => {
    if (!recognitionRef.current) {
      initRecognition();
    } else {
      // Actualizar parámetros si cambian
      recognitionRef.current.lang = lang;
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [lang, continuous, interimResults, initRecognition]);

  const start = useCallback(() => {
    // En móviles, a veces el objeto se corrompe si el navegador suspende la pestaña
    // Reiniciamos si no existe o si estamos en móvil para asegurar frescura
    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = initRecognition();
    }
    
    if (recognition && !isListening) {
      setTranscript('');
      try {
        recognition.start();
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          // Ya iniciado, ignorar
          console.log('🎙️ Ya estaba activo o en proceso');
        } else {
          console.error('Failed to start recognition:', err);
          // Re-intentar inicialización si falló catastróficamente
          recognitionRef.current = null;
          const fresh = initRecognition();
          if (fresh) fresh.start();
        }
      }
    }
  }, [isListening, initRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

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
