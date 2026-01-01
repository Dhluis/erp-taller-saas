import { Ratelimit } from '@upstash/ratelimit';
import type { 
  RateLimitConfig, 
  RateLimitResult, 
  RateLimiterOptions,
  RateLimiterPreset
} from './types';
import { RATE_LIMIT_PRESETS } from './types';

/**
 * Caché de rate limiters para evitar crear múltiples instancias
 */
const rateLimiterCache = new Map<string, Ratelimit>();

/**
 * Crear o recuperar un rate limiter desde el caché
 */
async function getRateLimiter(
  config: RateLimitConfig,
  options: RateLimiterOptions = {}
): Promise<Ratelimit> {
  const cacheKey = `${config.prefix || 'ratelimit'}-${config.limit}-${config.window}`;

  // Retornar desde caché si existe
  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  // Crear nuevo rate limiter
  const algorithm = options.algorithm || 'sliding-window';
  
  let limiter: Ratelimit;

  // Obtener cliente Redis (lazy initialization)
  // Importar dinámicamente para evitar ejecución durante el build
  const { getRedis, isRedisAvailable } = await import('./redis');
  
  // ⚠️ CRÍTICO: Si Redis no está disponible, retornar null y hacer fail-open
  // Esto evita que Upstash bloquee toda la aplicación
  if (!isRedisAvailable()) {
    console.warn('[Rate Limiter] ⚠️ Redis no disponible, rate limiting deshabilitado (fail-open)');
    throw new Error('REDIS_NOT_AVAILABLE');
  }
  
  // Si Redis no está configurado, esto lanzará un error
  // El código que llama a checkRateLimit debe manejar este error
  let redis;
  try {
    redis = getRedis();
  } catch (error) {
    console.warn('[Rate Limiter] ⚠️ Error obteniendo Redis, rate limiting deshabilitado (fail-open)', error);
    throw new Error('REDIS_NOT_AVAILABLE');
  }

  if (algorithm === 'sliding-window') {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: config.prefix || 'ratelimit',
      analytics: options.analytics ?? true,
      ...(options.ephemeralCache !== undefined && { ephemeralCache: options.ephemeralCache })
    });
  } else {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(config.limit, config.window),
      prefix: config.prefix || 'ratelimit',
      analytics: options.analytics ?? true,
      ...(options.ephemeralCache !== undefined && { ephemeralCache: options.ephemeralCache })
    });
  }

  // Guardar en caché
  rateLimiterCache.set(cacheKey, limiter);

  console.log(
    `[Rate Limiter] 🔧 Created new limiter: ${cacheKey} ` +
    `(${config.limit} requests per ${config.window})`
  );

  return limiter;
}

/**
 * Aplicar rate limiting a un identificador
 * 
 * @param identifier - String único que identifica al cliente (IP, org_id, user_id, etc)
 * @param config - Configuración del rate limit
 * @param options - Opciones adicionales
 * @returns Resultado del rate limiting
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  options: RateLimiterOptions = {}
): Promise<RateLimitResult> {
  try {
    const limiter = await getRateLimiter(config, options);

    // Aplicar rate limit
    const result = await limiter.limit(identifier);

    const rateLimitResult: RateLimitResult = {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      identifier,
      warning: result.remaining < config.limit * 0.2 // Warning si < 20% restante
    };

    // Logging basado en resultado
    if (!result.success) {
      console.warn(
        `[Rate Limit] 🚫 BLOCKED: ${identifier.substring(0, 20)}... ` +
        `(${result.remaining}/${result.limit} remaining, resets at ${new Date(result.reset).toISOString()})`
      );
    } else if (rateLimitResult.warning) {
      console.warn(
        `[Rate Limit] ⚠️ WARNING: ${identifier.substring(0, 20)}... ` +
        `(${result.remaining}/${result.limit} remaining)`
      );
    } else {
      console.log(
        `[Rate Limit] ✅ Allowed: ${identifier.substring(0, 20)}... ` +
        `(${result.remaining}/${result.limit} remaining)`
      );
    }

    return rateLimitResult;

  } catch (error) {
    // ⚠️ CRÍTICO: Si Redis no está disponible o hay cualquier error, PERMITIR el request (fail-open)
    // Esto evita que problemas con Upstash Redis bloqueen toda la aplicación
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage === 'REDIS_NOT_AVAILABLE' || errorMessage.includes('Missing environment variables')) {
      console.warn('[Rate Limit] ⚠️ Redis no disponible, permitiendo request (fail-open)');
    } else {
      console.error('[Rate Limit] ❌ Error checking rate limit:', error);
      console.warn('[Rate Limit] ⚠️ Failing open due to error');
    }
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + 60000, // 1 minuto en el futuro
      identifier
    };
  }
}

/**
 * Usar un preset de rate limiting predefinido
 * 
 * @param identifier - String único que identifica al cliente
 * @param preset - Nombre del preset a usar
 * @param options - Opciones adicionales
 * @returns Resultado del rate limiting
 */
export async function checkRateLimitWithPreset(
  identifier: string,
  preset: RateLimiterPreset,
  options: RateLimiterOptions = {}
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_PRESETS[preset];
  return checkRateLimit(identifier, config, options);
}

/**
 * Resetear el rate limit de un identificador específico
 * Útil para testing o para dar excepciones manuales
 * 
 * @param identifier - Identificador a resetear
 * @param config - Configuración del rate limit
 */
export async function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<boolean> {
  try {
    const limiter = await getRateLimiter(config);
    await limiter.resetUsedTokens(identifier);
    
    console.log(`[Rate Limit] 🔄 Reset: ${identifier.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('[Rate Limit] ❌ Error resetting rate limit:', error);
    return false;
  }
}

/**
 * Obtener el estado actual del rate limit sin incrementar el contador
 * 
 * @param identifier - Identificador a verificar
 * @param config - Configuración del rate limit
 * @returns Resultado del rate limiting (sin consumir un request)
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  try {
    const limiter = await getRateLimiter(config);
    const result = await limiter.getRemaining(identifier);

    return {
      success: result.remaining > 0,
      limit: config.limit,
      remaining: result.remaining,
      reset: result.reset,
      identifier,
      warning: result.remaining < config.limit * 0.2
    };
  } catch (error) {
    console.error('[Rate Limit] ❌ Error getting rate limit status:', error);
    return null;
  }
}

/**
 * Limpiar el caché de rate limiters
 * Útil para testing
 */
export function clearRateLimiterCache(): void {
  rateLimiterCache.clear();
  console.log('[Rate Limit] 🧹 Cache cleared');
}

/**
 * Configuraciones predefinidas para diferentes tipos de endpoints
 */
export const rateLimitConfigs = {
  /**
   * Para webhooks (WhatsApp, etc)
   * 100 requests por minuto por organización
   */
  webhook: {
    identifier: 'organization' as const,
    limit: 100,
    window: '1 m' as const,
    prefix: 'webhook'
  },

  /**
   * Para endpoints de autenticación
   * 5 intentos por minuto por IP
   */
  auth: {
    identifier: 'ip' as const,
    limit: 5,
    window: '1 m' as const,
    prefix: 'auth'
  },

  /**
   * Para AI Agent (llamadas a OpenAI)
   * 20 requests por minuto por organización
   */
  aiAgent: {
    identifier: 'organization' as const,
    limit: 20,
    window: '1 m' as const,
    prefix: 'ai'
  },

  /**
   * Para APIs de lectura (GET)
   * 60 requests por minuto por organización
   */
  apiRead: {
    identifier: 'organization' as const,
    limit: 60,
    window: '1 m' as const,
    prefix: 'api-read'
  },

  /**
   * Para APIs de escritura (POST/PUT/DELETE)
   * 30 requests por minuto por organización
   */
  apiWrite: {
    identifier: 'organization' as const,
    limit: 30,
    window: '1 m' as const,
    prefix: 'api-write'
  },

  /**
   * Para APIs públicas (sin autenticación)
   * 10 requests por minuto por IP
   */
  publicApi: {
    identifier: 'ip' as const,
    limit: 10,
    window: '1 m' as const,
    prefix: 'public'
  }
} as const;

/**
 * Helper para desarrollo: aumentar límites en desarrollo
 */
export function getConfigForEnvironment(
  config: RateLimitConfig,
  multiplier: number = 10
): RateLimitConfig {
  if (process.env.NODE_ENV === 'development') {
    return {
      ...config,
      limit: config.limit * multiplier
    };
  }
  return config;
}

