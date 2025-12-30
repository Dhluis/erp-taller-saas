import { Redis } from '@upstash/redis';

/**
 * Cliente singleton de Upstash Redis para rate limiting
 */
class RedisClient {
  private static instance: Redis | null = null;
  private static isConfigured: boolean = false;

  /**
   * Obtener instancia del cliente Redis
   */
  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = this.createClient();
    }
    return this.instance;
  }

  /**
   * Crear cliente de Redis
   */
  private static createClient(): Redis {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      const missingVars = [];
      if (!url) missingVars.push('UPSTASH_REDIS_REST_URL');
      if (!token) missingVars.push('UPSTASH_REDIS_REST_TOKEN');

      // Durante el build, Next.js puede ejecutar este código
      // Necesitamos permitir que el build continúe sin Redis configurado
      // El error se lanzará en runtime cuando realmente se necesite Redis
      const errorMessage = `[Redis] ❌ Missing environment variables: ${missingVars.join(', ')}\n` +
        `Please configure Upstash Redis credentials in Vercel Dashboard or .env.local\n` +
        `See: RATE_LIMITING_IMPLEMENTATION.md for setup instructions`;

      // Siempre lanzar error, pero el código que lo llama debe manejarlo
      throw new Error(errorMessage);
    }

    console.log('[Redis] ✅ Connecting to Upstash Redis...');
    
    this.isConfigured = true;

    return new Redis({
      url,
      token,
      // Configuración optimizada para rate limiting
      cache: 'no-store', // No cachear para tener datos en tiempo real
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * 2 ** retryCount, 3000)
      }
    });
  }

  /**
   * Verificar si Redis está configurado
   */
  static isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Resetear instancia (útil para testing)
   */
  static reset(): void {
    this.instance = null;
    this.isConfigured = false;
  }

  /**
   * Healthcheck de Redis
   */
  static async ping(): Promise<boolean> {
    try {
      const client = this.getInstance();
      const result = await client.ping();
      console.log('[Redis] 🏓 Ping:', result);
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] ❌ Ping failed:', error);
      return false;
    }
  }
}

/**
 * Obtener instancia del cliente Redis (lazy initialization)
 * No se inicializa hasta que se use por primera vez
 */
export function getRedis(): Redis {
  return RedisClient.getInstance();
}

/**
 * Verificar si Redis está disponible (sin inicializar)
 */
export function isRedisAvailable(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return !!(url && token);
}

/**
 * Funciones helper para operaciones comunes
 */

/**
 * Obtener valor de Redis con tipo seguro
 */
export async function getRedisValue<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error(`[Redis] ❌ Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Establecer valor en Redis con expiración
 */
export async function setRedisValue<T>(
  key: string,
  value: T,
  expirationSeconds?: number
): Promise<boolean> {
  try {
    if (expirationSeconds) {
      await redis.setex(key, expirationSeconds, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error(`[Redis] ❌ Error setting key ${key}:`, error);
    return false;
  }
}

/**
 * Eliminar clave de Redis
 */
export async function deleteRedisKey(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] ❌ Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Incrementar contador con expiración
 */
export async function incrementCounter(
  key: string,
  expirationSeconds: number
): Promise<number> {
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, expirationSeconds);
    
    const results = await pipeline.exec();
    const count = results[0] as number;
    
    return count;
  } catch (error) {
    console.error(`[Redis] ❌ Error incrementing key ${key}:`, error);
    throw error;
  }
}

/**
 * Verificar existencia de clave
 */
export async function keyExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`[Redis] ❌ Error checking key ${key}:`, error);
    return false;
  }
}

/**
 * Obtener TTL de una clave
 */
export async function getKeyTTL(key: string): Promise<number> {
  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error(`[Redis] ❌ Error getting TTL for key ${key}:`, error);
    return -1;
  }
}

/**
 * Healthcheck completo
 */
export async function redisHealthCheck(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    const isAlive = await RedisClient.ping();
    const latency = Date.now() - start;

    if (!isAlive) {
      return {
        healthy: false,
        latency,
        error: 'Redis ping failed'
      };
    }

    return {
      healthy: true,
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default RedisClient;

