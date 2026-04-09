import { NextRequest, NextResponse } from 'next/server'
import { redisHealthCheck, getRedis, REDIS_KEYS } from '@/lib/rate-limit/redis'
import { createClientFromRequest } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // 1. Diagnóstico de Salud de Redis (Público)
  let health: any = { healthy: false, latency: 0 }
  let metrics: any = { hits: 0, misses: 0, rate: '0%' }
  
  try {
    health = await redisHealthCheck()
    const redis = getRedis()
    const rawHits = await redis.get(REDIS_KEYS.METRICS.CACHE_HITS)
    const rawMisses = await redis.get(REDIS_KEYS.METRICS.CACHE_MISSES)
    const hits = Number(rawHits) || 0
    const misses = Number(rawMisses) || 0
    const total = hits + misses || 1
    metrics = {
      hits,
      misses,
      rate: ((hits / total) * 100).toFixed(2) + '%'
    }
  } catch (err) {
    console.error('[Debug Cache] Redis error:', err)
  }

  try {
    // 2. Intento de autenticación usando el cliente robusto
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    let profile: any = null
    let hasPermission = false

    if (user) {
      const { data: dbProfile } = await supabase
        .from('system_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
      
      profile = dbProfile
      hasPermission = profile?.role?.toUpperCase() === 'ADMIN'
    }

    // 3. Respuesta combinada
    return NextResponse.json({
      redis: {
        status: health.healthy ? '✅ ONLINE' : '❌ OFFLINE',
        latency: health.latency + 'ms',
        metrics: {
          total_saved_queries: metrics.hits,
          total_misses: metrics.misses,
          efficiency: metrics.rate
        }
      },
      auth_debug: {
        is_logged_in: !!user,
        user_id: user?.id || 'null',
        email: user?.email || 'null',
        role_detected: profile?.role || 'null',
        has_admin_access: hasPermission,
        auth_error: authError?.message || null // Aquí estaba el error anterior
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      redis_status: health.healthy ? 'ONLINE' : 'OFFLINE',
      error: 'Error crítico en diagnóstico',
      details: error.message
    }, { status: 500 })
  }
}
