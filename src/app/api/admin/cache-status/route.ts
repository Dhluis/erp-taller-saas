import { NextRequest, NextResponse } from 'next/server'
import { redisHealthCheck, getRedis, REDIS_KEYS } from '@/lib/rate-limit/redis'
import { checkUserPermissions } from '@/lib/supabase/middleware-robust'

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar que el usuario sea ADMIN
    const { hasPermission, user, profile } = await checkUserPermissions(request, ['ADMIN', 'admin'])
    
    if (!hasPermission) {
      return NextResponse.json(
        { 
          error: 'No autorizado. Se requiere rol de administrador.',
          debug: {
            user_found: !!user,
            profile_found: !!profile,
            detected_role: profile?.role || 'NONE',
            user_id: user?.id || 'NONE'
          }
        },
        { status: 403 }
      )
    }

    // 2. Obtener estado de Redis
    const health = await redisHealthCheck()
    const redis = getRedis()
    
    // 3. Obtener métricas de hits/misses
    const hits = await redis.get<number>(REDIS_KEYS.METRICS.CACHE_HITS) || 0
    const misses = await redis.get<number>(REDIS_KEYS.METRICS.CACHE_MISSES) || 0
    const total = (hits + misses) || 1
    const hitRate = ((hits / total) * 100).toFixed(2) + '%'

    // 4. Verificar si el usuario actual está en el caché
    const userCacheKey = `${REDIS_KEYS.SESSION_PROFILE}:${user.id}`
    const isUserCached = await redis.exists(userCacheKey)

    return NextResponse.json({
      status: health.healthy ? '✅ Online' : '❌ Offline',
      latency: health.latency + 'ms',
      metrics: {
        total_requests: hits + misses,
        hits,
        misses,
        efficiency_rate: hitRate
      },
      current_session: {
        user_id: user.id,
        email: user.email,
        cached: isUserCached === 1 ? 'YES' : 'NO',
        cache_key: userCacheKey
      },
      config: {
        ttl_seconds: 300,
        strategy: 'TTL + Proactive Invalidation'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Cache Status API] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener estado del caché', details: error.message },
      { status: 500 }
    )
  }
}
