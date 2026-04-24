import { NextRequest, NextResponse } from 'next/server';
import { redisHealthCheck, getRedis, REDIS_KEYS } from '@/lib/rate-limit/redis'
import { createClientFromRequest } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // 1. Verificar autenticación y rol admin antes de exponer cualquier dato
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    const roleStr = (profile?.role || '').toUpperCase()
    const isAdmin = roleStr === 'ADMIN' || roleStr === 'ADMINISTRADOR'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Solo admins llegan aquí — diagnóstico de Redis
  let health: any = { healthy: false, latency: 0 }
  let metrics: any = { hits: 0, misses: 0, rate: '0%' }

  try {
    health = await redisHealthCheck()
    const redis = await getRedis()
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
    timestamp: new Date().toISOString()
  })
}
