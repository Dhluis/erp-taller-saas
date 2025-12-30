/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  /**
   * Tipo de identificador para el rate limit
   * - 'ip': Limitar por dirección IP (auth endpoints)
   * - 'organization': Limitar por organization_id (APIs multi-tenant)
   * - 'user': Limitar por user_id (APIs específicas de usuario)
   * - 'custom': Usar un identificador personalizado
   */
  identifier: 'ip' | 'organization' | 'user' | 'custom';

  /**
   * Identificador personalizado (solo si identifier === 'custom')
   */
  customIdentifier?: string;

  /**
   * Número máximo de requests permitidos
   */
  limit: number;

  /**
   * Ventana de tiempo
   * Formato: '10 s' | '1 m' | '1 h' | '1 d'
   */
  window: '10 s' | '1 m' | '1 h' | '1 d';

  /**
   * Prefijo para la clave en Redis (opcional)
   * Default: 'ratelimit'
   */
  prefix?: string;
}

/**
 * Resultado del rate limiting
 */
export interface RateLimitResult {
  /**
   * Si el request fue permitido (true) o bloqueado (false)
   */
  success: boolean;

  /**
   * Límite máximo configurado
   */
  limit: number;

  /**
   * Requests restantes en la ventana actual
   */
  remaining: number;

  /**
   * Timestamp cuando se resetea el contador (en ms)
   */
  reset: number;

  /**
   * Identificador usado para el rate limit
   */
  identifier: string;

  /**
   * Si el rate limit está en estado de advertencia (< 20% remaining)
   */
  warning?: boolean;
}

/**
 * Información del cliente
 */
export interface ClientInfo {
  /**
   * Dirección IP del cliente
   */
  ip: string;

  /**
   * User agent del cliente
   */
  userAgent?: string;

  /**
   * País/región (si está disponible desde headers)
   */
  country?: string;

  /**
   * Organization ID (si está autenticado)
   */
  organizationId?: string;

  /**
   * User ID (si está autenticado)
   */
  userId?: string;
}

/**
 * Opciones para el rate limiter
 */
export interface RateLimiterOptions {
  /**
   * Algoritmo de rate limiting
   * - 'sliding-window': Ventana deslizante (recomendado)
   * - 'fixed-window': Ventana fija
   */
  algorithm?: 'sliding-window' | 'fixed-window';

  /**
   * Tiempo de vida de las claves en Redis (en segundos)
   * Default: 2x la ventana de tiempo
   */
  ephemeralCache?: number;

  /**
   * Analytics habilitado
   */
  analytics?: boolean;
}

/**
 * Configuración de rate limiters predefinidos
 */
export type RateLimiterPreset = 
  | 'webhook'           // 100 req/min
  | 'auth'              // 5 req/min
  | 'ai-agent'          // 20 req/min
  | 'api-read'          // 60 req/min
  | 'api-write'         // 30 req/min
  | 'public-api';       // 10 req/min

/**
 * Mapa de presets a configuraciones
 */
export const RATE_LIMIT_PRESETS: Record<RateLimiterPreset, RateLimitConfig> = {
  webhook: {
    identifier: 'organization',
    limit: 100,
    window: '1 m',
    prefix: 'webhook'
  },
  auth: {
    identifier: 'ip',
    limit: 5,
    window: '1 m',
    prefix: 'auth'
  },
  'ai-agent': {
    identifier: 'organization',
    limit: 20,
    window: '1 m',
    prefix: 'ai'
  },
  'api-read': {
    identifier: 'organization',
    limit: 60,
    window: '1 m',
    prefix: 'api-read'
  },
  'api-write': {
    identifier: 'organization',
    limit: 30,
    window: '1 m',
    prefix: 'api-write'
  },
  'public-api': {
    identifier: 'ip',
    limit: 10,
    window: '1 m',
    prefix: 'public'
  }
};

/**
 * Headers HTTP para rate limiting
 */
export interface RateLimitHeaders extends Record<string, string> {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Error de rate limiting
 */
export class RateLimitError extends Error {
  constructor(
    public readonly result: RateLimitResult,
    message: string = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

