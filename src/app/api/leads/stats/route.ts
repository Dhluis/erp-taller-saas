// src/app/api/leads/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/leads/stats
 * Obtener estadísticas de leads de la organización
 * 
 * Query params:
 * - timeFilter: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' (default: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id

    // Obtener filtro de tiempo
    const searchParams = request.nextUrl.searchParams
    const timeFilter = searchParams.get('timeFilter') || 'all'

    // Calcular rango de fechas
    let dateFilter = null
    const now = new Date()
    
    switch (timeFilter) {
      case 'today':
        dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        break
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString()
        break
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
        break
      case 'quarter':
        dateFilter = new Date(now.setMonth(now.getMonth() - 3)).toISOString()
        break
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
        break
    }

    // Query base
    let query = supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)

    // Aplicar filtro de fecha
    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    // Obtener todos los leads
    const { data: leads, error: leadsError } = await query

    if (leadsError) {
      console.error('[Leads Stats] Error obteniendo leads:', leadsError)
      return NextResponse.json(
        { error: 'Error obteniendo estadísticas', details: leadsError.message },
        { status: 500 }
      )
    }

    // Calcular estadísticas
    const stats = {
      total: leads.length,
      
      // Por estado
      byStatus: {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        qualified: leads.filter(l => l.status === 'qualified').length,
        appointment: leads.filter(l => l.status === 'appointment').length,
        converted: leads.filter(l => l.status === 'converted').length,
        lost: leads.filter(l => l.status === 'lost').length
      },
      
      // Tasas
      conversionRate: leads.length > 0 
        ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(2)
        : '0.00',
      
      lossRate: leads.length > 0
        ? ((leads.filter(l => l.status === 'lost').length / leads.length) * 100).toFixed(2)
        : '0.00',
      
      // Valores
      totalValue: leads.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0),
      convertedValue: leads
        .filter(l => l.status === 'converted')
        .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0),
      
      averageValue: leads.length > 0
        ? (leads.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0) / leads.length).toFixed(2)
        : '0.00',
      
      averageConvertedValue: leads.filter(l => l.status === 'converted').length > 0
        ? (leads
            .filter(l => l.status === 'converted')
            .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0) 
          / leads.filter(l => l.status === 'converted').length).toFixed(2)
        : '0.00',
      
      // Por fuente
      bySource: leads.reduce((acc, lead) => {
        const source = lead.lead_source || 'unknown'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      
      // Tiempo promedio de conversión (en días)
      averageDaysToConvert: (() => {
        const convertedLeads = leads.filter(l => l.status === 'converted' && l.converted_at)
        if (convertedLeads.length === 0) return '0.00'
        
        const totalDays = convertedLeads.reduce((sum, lead) => {
          const created = new Date(lead.created_at).getTime()
          const converted = new Date(lead.converted_at).getTime()
          const days = (converted - created) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0)
        
        return (totalDays / convertedLeads.length).toFixed(2)
      })(),
      
      // Top asesores
      topAssignees: (() => {
        const assigneeStats = leads.reduce((acc, lead) => {
          if (lead.assigned_to) {
            if (!acc[lead.assigned_to]) {
              acc[lead.assigned_to] = { total: 0, converted: 0 }
            }
            acc[lead.assigned_to].total++
            if (lead.status === 'converted') {
              acc[lead.assigned_to].converted++
            }
          }
          return acc
        }, {} as Record<string, { total: number, converted: number }>)
        
        return Object.entries(assigneeStats)
          .map(([id, stats]) => ({
            user_id: id,
            total: stats.total,
            converted: stats.converted,
            conversionRate: ((stats.converted / stats.total) * 100).toFixed(2)
          }))
          .sort((a, b) => b.converted - a.converted)
          .slice(0, 5) // Top 5
      })(),
      
      // Leads por día (últimos 30 días si es 'all' o el rango filtrado)
      leadsOverTime: (() => {
        const days = timeFilter === 'all' ? 30 : 
                     timeFilter === 'today' ? 1 :
                     timeFilter === 'week' ? 7 :
                     timeFilter === 'month' ? 30 :
                     timeFilter === 'quarter' ? 90 :
                     365
        
        const dateMap = new Map<string, number>()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        leads.forEach(lead => {
          const createdDate = new Date(lead.created_at)
          if (createdDate >= startDate) {
            const dateKey = createdDate.toISOString().split('T')[0]
            dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
          }
        })
        
        return Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      })()
    }

    console.log('[Leads Stats] Estadísticas calculadas:', {
      organization_id: organizationId,
      time_filter: timeFilter,
      total_leads: stats.total
    })

    return NextResponse.json({
      success: true,
      data: stats,
      timeFilter,
      organizationId
    })

  } catch (error: any) {
    console.error('[Leads Stats] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

