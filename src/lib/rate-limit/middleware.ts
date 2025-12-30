import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitConfigs } from './rate-limiter';
import { getClientIp, getClientInfo, logClientInfo } from '../utils/get-client-info';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import type { RateLimitConfig, RateLimitResult, RateLimitHeaders } from './types';

/**
 * Aplicar rate limiting a un request de Next.js
 * 
 * @param request - Next.js request object
 * @param config - Configuración del rate limit
 * @returns RateLimitResult con información del rate limiting
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const result = await applyRateLimit(request, {
 *     identifier: 'organization',
 *     limit: 100,
 *     window: '1 m'
 *   });
 *   
 *   if (!result.success) {
 *     return NextResponse.json(
 *       { error: 'Rate limit exceeded' },
 *       { status: 429 }
 *     );
 *   }
 *   
 *   // Tu lógica aquí
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Obtener identificador basado en la configuración
  const identifier = await getIdentifier(request, config);

  // Logging (opcional, útil para debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Rate Limit Middleware] Checking limit for: ${identifier.substring(0, 30)}...`
    );
  }

  // Aplicar rate limit
  const result = await checkRateLimit(identifier, config);

  return result;
}

/**
 * Obtener el identificador correcto basado en la configuración
 */
async function getIdentifier(
  request: NextRequest,
  config: RateLimitConfig
): Promise<string> {
  switch (config.identifier) {
    case 'ip':
      return getClientIp(request);

    case 'organization': {
      try {
        const tenantContext = await getTenantContext(request);
        const organizationId = tenantContext.organizationId;
        if (!organizationId) {
          console.warn(
            '[Rate Limit] ⚠️ Could not get organization ID, falling back to IP'
          );
          return `ip:${getClientIp(request)}`;
        }
        return `org:${organizationId}`;
      } catch (error) {
        console.warn(
          '[Rate Limit] ⚠️ Could not get organization ID, falling back to IP',
          error instanceof Error ? error.message : 'Unknown error'
        );
        return `ip:${getClientIp(request)}`;
      }
    }

    case 'user': {
      // Implementar cuando tengas user context
      // Por ahora, fallback a IP
      console.warn(
        '[Rate Limit] ⚠️ User identifier not implemented, falling back to IP'
      );
      return `ip:${getClientIp(request)}`;
    }

    case 'custom': {
      if (config.customIdentifier) {
        return config.customIdentifier;
      }
      throw new Error(
        '[Rate Limit] ❌ Custom identifier specified but customIdentifier not provided'
      );
    }

    default:
      throw new Error(`[Rate Limit] ❌ Unknown identifier type: ${config.identifier}`);
  }
}

/**
 * Crear headers HTTP estándar para rate limiting
 * Siguiendo las especificaciones de IETF draft-polli-ratelimit-headers
 * 
 * @param result - Resultado del rate limiting
 * @returns Headers object para incluir en la respuesta
 */
export function createRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString()
  };

  // Si está bloqueado, agregar Retry-After
  if (!result.success) {
    const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    headers['Retry-After'] = retryAfterSeconds.toString();
  }

  return headers;
}

/**
 * Crear respuesta de error 429 con formato estándar
 * 
 * @param result - Resultado del rate limiting
 * @param message - Mensaje de error personalizado (opcional)
 * @returns NextResponse con status 429
 */
export function createRateLimitErrorResponse(
  result: RateLimitResult,
  message?: string
): NextResponse {
  const headers = createRateLimitHeaders(result);
  
  const errorMessage = message || 'Too many requests. Please try again later.';
  const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: errorMessage,
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      remaining: result.remaining,
      resetAt: new Date(result.reset).toISOString(),
      retryAfter: retryAfterSeconds
    },
    {
      status: 429,
      headers
    }
  );
}

/**
 * Wrapper completo que aplica rate limiting y retorna respuesta automáticamente
 * Si el rate limit es excedido, retorna 429. Si no, retorna null (continuar)
 * 
 * @param request - Next.js request object
 * @param config - Configuración del rate limit
 * @returns NextResponse con 429 si bloqueado, null si permitido
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = await withRateLimit(request, {
 *     identifier: 'organization',
 *     limit: 100,
 *     window: '1 m'
 *   });
 *   
 *   if (rateLimitResponse) {
 *     return rateLimitResponse; // Bloqueado, retornar 429
 *   }
 *   
 *   // Permitido, continuar con la lógica
 *   // ...
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  customMessage?: string
): Promise<NextResponse | null> {
  const result = await applyRateLimit(request, config);

  if (!result.success) {
    return createRateLimitErrorResponse(result, customMessage);
  }

  return null;
}

/**
 * Helpers para usar presets predefinidos
 */
export const rateLimitMiddleware = {
  /**
   * Rate limit para webhooks (100 req/min por organization)
   */
  webhook: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.webhook,
      'Webhook rate limit exceeded. Please reduce frequency.'
    );
  },

  /**
   * Rate limit para auth (5 req/min por IP)
   */
  auth: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.auth,
      'Too many authentication attempts. Please try again later.'
    );
  },

  /**
   * Rate limit para AI Agent (20 req/min por organization)
   */
  aiAgent: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.aiAgent,
      'AI Agent rate limit exceeded. Please wait before sending more messages.'
    );
  },

  /**
   * Rate limit para API reads (60 req/min por organization)
   */
  apiRead: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.apiRead,
      'API read rate limit exceeded. Please reduce request frequency.'
    );
  },

  /**
   * Rate limit para API writes (30 req/min por organization)
   */
  apiWrite: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.apiWrite,
      'API write rate limit exceeded. Please reduce request frequency.'
    );
  },

  /**
   * Rate limit para APIs públicas (10 req/min por IP)
   */
  publicApi: async (request: NextRequest) => {
    return withRateLimit(
      request,
      rateLimitConfigs.publicApi,
      'Public API rate limit exceeded. Please try again later.'
    );
  }
};

/**
 * Agregar headers de rate limit a cualquier respuesta
 * Útil para informar al cliente sobre sus límites actuales
 */
export async function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse> {
  const result = await applyRateLimit(request, config);
  const headers = createRateLimitHeaders(result);

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Logging helper para debugging de rate limiting
 */
export function logRateLimitAttempt(
  request: NextRequest,
  result: RateLimitResult,
  endpoint: string
): void {
  const clientInfo = getClientInfo(request);
  
  const logMessage = 
    `[Rate Limit] ${result.success ? '✅ ALLOWED' : '🚫 BLOCKED'} | ` +
    `Endpoint: ${endpoint} | ` +
    `IP: ${clientInfo.ip} | ` +
    `Identifier: ${result.identifier.substring(0, 20)}... | ` +
    `Remaining: ${result.remaining}/${result.limit}`;

  if (result.success) {
    console.log(logMessage);
  } else {
    console.warn(logMessage);
  }
}

