/**
 * Utilidades seguras para fetch/HTTP
 * Maneja errores de red, HTTP, JSON parsing y respuestas HTML
 */

import { useState, useCallback } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface SafeFetchResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
  status: number;
  statusText: string;
}

export interface ApiError {
  message: string;
  code: string;
  status?: number;
  details?: any;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_TIMEOUT = 10000; // 10 segundos
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000; // 1 segundo

// ============================================================================
// UTILIDADES AUXILIARES
// ============================================================================

/**
 * Detecta si una respuesta es HTML en lugar de JSON
 */
function isHtmlResponse(contentType: string | null, text: string): boolean {
  if (!contentType) return false;
  
  // Verificar content-type
  const isHtmlContentType = contentType.includes('text/html') || 
                           contentType.includes('application/xhtml');
  
  // Verificar contenido HTML
  const hasHtmlTags = /<[^>]+>/.test(text);
  
  return isHtmlContentType || hasHtmlTags;
}

/**
 * Extrae mensaje de error de diferentes formatos de respuesta
 */
function extractErrorMessage(response: Response, text: string): string {
  try {
    const json = JSON.parse(text);
    return json.message || json.error || json.detail || 'Error desconocido';
  } catch {
    // Si no es JSON válido, usar el texto de la respuesta
    return text || response.statusText || 'Error desconocido';
  }
}

/**
 * Espera un tiempo determinado
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// FUNCIÓN PRINCIPAL: safeFetch
// ============================================================================

/**
 * Wrapper seguro de fetch que maneja errores HTTP, JSON parsing y respuestas HTML
 */
export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Configurar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Realizar fetch
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      // Obtener texto de respuesta para análisis
      const responseText = await response.text();
      
      // Verificar si la respuesta es HTML (error de servidor)
      const contentType = response.headers.get('content-type');
      if (isHtmlResponse(contentType, responseText)) {
        const errorMessage = `Respuesta HTML inesperada (${response.status}): ${responseText.substring(0, 200)}...`;
        return {
          data: null,
          error: errorMessage,
          success: false,
          status: response.status,
          statusText: response.statusText,
        };
      }
      
      // Verificar status HTTP
      if (!response.ok) {
        const errorMessage = extractErrorMessage(response, responseText);
        return {
          data: null,
          error: `HTTP ${response.status}: ${errorMessage}`,
          success: false,
          status: response.status,
          statusText: response.statusText,
        };
      }
      
      // Verificar content-type para JSON
      if (contentType && !contentType.includes('application/json')) {
        return {
          data: null,
          error: `Content-Type inesperado: ${contentType}. Se esperaba JSON.`,
          success: false,
          status: response.status,
          statusText: response.statusText,
        };
      }
      
      // Parsear JSON de forma segura
      let data: T;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          data: null,
          error: `Error al parsear JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
          success: false,
          status: response.status,
          statusText: response.statusText,
        };
      }
      
      // Éxito
      return {
        data,
        error: null,
        success: true,
        status: response.status,
        statusText: response.statusText,
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Si es error de red y tenemos reintentos, esperar y reintentar
      if (attempt < retries && (
        error instanceof TypeError || // Network error
        error.name === 'AbortError'   // Timeout
      )) {
        await delay(retryDelay * (attempt + 1)); // Backoff exponencial
        continue;
      }
      
      // Si no hay más reintentos o es otro tipo de error, devolver error
      break;
    }
  }
  
  // Manejar error final
  const errorMessage = lastError?.message || 'Error desconocido';
  const isNetworkError = lastError instanceof TypeError;
  const isTimeoutError = lastError?.name === 'AbortError';
  
  return {
    data: null,
    error: isTimeoutError 
      ? `Timeout después de ${timeout}ms`
      : isNetworkError
      ? `Error de red: ${errorMessage}`
      : errorMessage,
    success: false,
    status: 0,
    statusText: isNetworkError ? 'Network Error' : 'Unknown Error',
  };
}

// ============================================================================
// FUNCIÓN: handleApiError
// ============================================================================

/**
 * Normaliza errores de diferentes fuentes (Network, HTTP, JSON, Supabase)
 */
export function handleApiError(error: any): ApiError {
  // Error de Supabase
  if (error?.code && error?.message) {
    return {
      message: error.message,
      code: error.code,
      details: error.details || error.hint,
    };
  }
  
  // Error de fetch/HTTP
  if (error?.status) {
    return {
      message: error.message || `HTTP ${error.status}`,
      code: `HTTP_${error.status}`,
      status: error.status,
      details: error.statusText,
    };
  }
  
  // Error de red
  if (error instanceof TypeError) {
    return {
      message: 'Error de conexión de red',
      code: 'NETWORK_ERROR',
      details: error.message,
    };
  }
  
  // Error de timeout
  if (error?.name === 'AbortError') {
    return {
      message: 'Timeout de conexión',
      code: 'TIMEOUT_ERROR',
      details: error.message,
    };
  }
  
  // Error de JSON parsing
  if (error instanceof SyntaxError) {
    return {
      message: 'Error al procesar respuesta del servidor',
      code: 'JSON_PARSE_ERROR',
      details: error.message,
    };
  }
  
  // Error genérico
  return {
    message: error?.message || 'Error desconocido',
    code: 'UNKNOWN_ERROR',
    details: error,
  };
}

// ============================================================================
// FUNCIONES DE CONVENIENCIA
// ============================================================================

/**
 * GET request seguro
 */
export async function safeGet<T = any>(
  url: string,
  options: Omit<SafeFetchOptions, 'method' | 'body'> = {}
): Promise<SafeFetchResponse<T>> {
  return safeFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request seguro
 */
export async function safePost<T = any>(
  url: string,
  data: any,
  options: Omit<SafeFetchOptions, 'method'> = {}
): Promise<SafeFetchResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT request seguro
 */
export async function safePut<T = any>(
  url: string,
  data: any,
  options: Omit<SafeFetchOptions, 'method'> = {}
): Promise<SafeFetchResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request seguro
 */
export async function safeDelete<T = any>(
  url: string,
  options: Omit<SafeFetchOptions, 'method' | 'body'> = {}
): Promise<SafeFetchResponse<T>> {
  return safeFetch<T>(url, { ...options, method: 'DELETE' });
}

/**
 * PATCH request seguro
 */
export async function safePatch<T = any>(
  url: string,
  data: any,
  options: Omit<SafeFetchOptions, 'method'> = {}
): Promise<SafeFetchResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// HOOK PARA REACT
// ============================================================================

/**
 * Hook para usar safeFetch en componentes React
 */
export function useSafeFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async <T = any>(
    url: string,
    options: SafeFetchOptions = {}
  ): Promise<SafeFetchResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<T>(url, options);
      
      if (!result.success) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      
      return {
        data: null,
        error: apiError.message,
        success: false,
        status: 0,
        statusText: 'Error',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchData, loading, error };
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default {
  safeFetch,
  handleApiError,
  safeGet,
  safePost,
  safePut,
  safeDelete,
  safePatch,
  useSafeFetch,
};
