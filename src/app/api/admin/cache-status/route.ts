import { NextRequest, NextResponse } from 'next/server'
import { redisHealthCheck, getRedis, REDIS_KEYS } from '@/lib/rate-limit/redis'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // 1. Diagnóstico de Salud de Redis (Público para este endpoint de debug)
  let health: any = { healthy: false, latency: 0 }
  let metrics: any = { hits: 0, misses: 0, rate: '0%' }
  
  try {
    health = await redisHealthCheck()
    const redis = getRedis()
    const hits = (await redis.get<number>(REDIS_KEYS.METRICS.CACHE_HITS)) || 0
    const misses = (await redis.get<number>(REDIS_KEYS.METRICS.CACHE_MISSES)) || 0
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
    // 2. Intento de autenticación usando el cliente estándar de servidor
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let profile: any = null
    let hasPermission = false

    if (user) {
      // Consultar perfil
      const { data: dbProfile } = await supabase
        .from('system_users')
        .select('role')
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
        has_admin_access: hasPermission
      },
      instructions: !hasPermission ? "Si ves 'is_logged_in: true' pero 'has_admin_access: false', tu rol no es ADMIN en system_users." : "Todo en orden.",
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      redis_status: health.healthy ? 'ONLINE' : 'OFFLINE',
      error: 'Error en la verificación de sesión',
      details: error.message
    }, { status: 500 })
  }
}
