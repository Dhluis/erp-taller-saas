interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Ejecuta una query de Supabase con retry automático en caso de errores de red
 */
export async function withRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      // Si hay data o el error no es de red, retornar
      if (result?.data || !isNetworkError(result?.error)) {
        return result;
      }
      
      // Si es el último intento, retornar el error
      if (attempt === maxRetries) {
        console.error(`❌ [Retry] Falló después de ${maxRetries} intentos:`, result.error);
        return result;
      }
      
      // Esperar antes de reintentar (backoff exponencial simple)
      console.warn(`⚠️ [Retry] Intento ${attempt}/${maxRetries} falló, reintentando en ${delayMs}ms...`);
      await sleep(delayMs * attempt);
      
    } catch (error) {
      console.error(`❌ [Retry] Error en intento ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        return { data: null, error };
      }
      
      await sleep(delayMs * attempt);
    }
  }
  
  return { data: null, error: new Error('Max retries exceeded') };
}

/** Detecta si es un error de red que vale la pena reintentar */
function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const networkErrors = [
    'Failed to fetch',
    'NetworkError',
    'ERR_CONNECTION_CLOSED',
    'ERR_CONNECTION_REFUSED',
    'ERR_CONNECTION_RESET',
    'ECONNRESET',
    'ETIMEDOUT',
  ];
  
  const errorMessage = (error?.message || String(error));
  return networkErrors.some(msg => errorMessage.includes(msg));
}

/** Espera una cantidad de milisegundos */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}









