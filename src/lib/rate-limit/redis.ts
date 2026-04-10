import { Redis as UpstashRedis } from '@upstash/redis';
// ⚠️ NO importar ioredis aquí, rompe el Middleware (Edge Runtime)
// import IORedis from 'ioredis';

/**
 * Prefijos de claves para Redis
 */
export const REDIS_KEYS = {
  SESSION_PROFILE: 'session:profile',
  METRICS: {
    CACHE_HITS: 'metrics:session_cache:hits',
    CACHE_MISSES: 'metrics:session_cache:misses',
  }
} as const;

/**
 * Cliente Universal de Redis (Soporta TCP y HTTP)
 * ✅ Node.js Runtime: Usa ioredis (TCP) -> Mayor velocidad
 * ✅ Edge Runtime: Usa Upstash (HTTP) -> Compatibilidad con Vercel Middleware
 */
class RedisClient {
  private static upstashInstance: UpstashRedis | null = null;
  private static ioredisInstance: IORedis | null = null;
  private static selectedEngine: 'ioredis' | 'upstash' | 'none' = 'none';

  /**
   * Obtener instancia del cliente según el entorno
   */
  static async getInstance(): Promise<any> {
    const isEdge = process.env.NEXT_RUNTIME === 'edge';
    const redisUrl = process.env.REDIS_URL;

    // 1. Intentar usar ioredis (TCP) si estamos en Node.js y hay URL
    if (!isEdge && redisUrl) {
      if (!this.ioredisInstance) {
        try {
          console.log('[Redis] 🚀 Usando motor TCP (ioredis) para Hostinger...');
          // Importación dinámica para evitar que Edge intente procesar ioredis
          const IORedisModule = await import('ioredis');
          const IORedis = IORedisModule.default || IORedisModule;
          this.ioredisInstance = new IORedis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
          });
          this.selectedEngine = 'ioredis';
        } catch (error) {
          console.warn('[Redis] ⚠️ Falló motor TCP, intentando fallback...', error);
        }
      }
      if (this.ioredisInstance) return this.ioredisInstance;
    }

    // 2. Fallback a Upstash (HTTP) para Edge o si no hay ioredis
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      if (!this.upstashInstance) {
        console.log('[Redis] ☁️ Usando motor HTTP (Upstash) para Edge/Vercel...');
        this.upstashInstance = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
          cache: 'no-store',
        });
        this.selectedEngine = 'upstash';
      }
      return this.upstashInstance;
    }

    this.selectedEngine = 'none';
    throw new Error('REDIS_NOT_CONFIGURED: Falta REDIS_URL o variables de Upstash');
  }

  static getEngine() {
    return this.selectedEngine;
  }

  static async ping(): Promise<boolean> {
    try {
      const client = await this.getInstance();
      const result = await client.ping();
      return result === 'PONG' || result === 'OK';
    } catch (error) {
      console.error('[Redis] ❌ Ping failed:', error);
      return false;
    }
  }
}

/**
 * Obtener instancia del cliente Redis (compatibilidad)
 */
export async function getRedis(): Promise<any> {
  return await RedisClient.getInstance();
}

/**
 * Verificar si Redis está configurado
 */
export function isRedisAvailable(): boolean {
  const isEdge = process.env.NEXT_RUNTIME === 'edge';
  if (isEdge) {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  }
  return !!(process.env.REDIS_URL || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN));
}

/**
 * Funciones helper universales
 */

export async function getRedisValue<T>(key: string): Promise<T | null> {
  try {
    const redis = await RedisClient.getInstance();
    const value = await redis.get(key);
    
    if (!value) return null;
    
    // El motor ioredis devuelve strings, Upstash puede devolver objetos
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return value as unknown as T; }
    }
    return value as T;
  } catch (error) {
    console.warn(`[Redis] ⚠️ Error leyendo ${key}:`, error);
    return null;
  }
}

export async function setRedisValue<T>(
  key: string,
  value: T,
  expirationSeconds?: number
): Promise<boolean> {
  try {
    const redis = await RedisClient.getInstance();
    const stringValue = JSON.stringify(value);
    
    if (expirationSeconds) {
      if (RedisClient.getEngine() === 'upstash') {
        await redis.setex(key, expirationSeconds, stringValue);
      } else {
        await redis.set(key, stringValue, 'EX', expirationSeconds);
      }
    } else {
      await redis.set(key, stringValue);
    }
    return true;
  } catch (error) {
    console.warn(`[Redis] ⚠️ Error guardando ${key}:`, error);
    return false;
  }
}

export async function deleteRedisKey(key: string): Promise<boolean> {
  try {
    const redis = await RedisClient.getInstance();
    await redis.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

export async function incrementCounter(key: string, expirationSeconds: number): Promise<number> {
  try {
    const redis = await RedisClient.getInstance();
    if (RedisClient.getEngine() === 'upstash') {
      const p = redis.pipeline();
      p.incr(key);
      p.expire(key, expirationSeconds);
      const res = await p.exec();
      return res[0] as number;
    } else {
      const count = await redis.incr(key);
      await redis.expire(key, expirationSeconds);
      return count;
    }
  } catch (error) {
    console.warn(`[Redis] ⚠️ Error incrementando ${key}:`, error);
    return 0;
  }
}

export async function redisHealthCheck() {
  const start = Date.now();
  try {
    const healthy = await RedisClient.ping();
    return {
      healthy,
      latency: Date.now() - start,
      engine: RedisClient.getEngine()
    };
  } catch (error) {
    return { healthy: false, error: 'Connection failed', engine: 'none' };
  }
}

export default RedisClient;

