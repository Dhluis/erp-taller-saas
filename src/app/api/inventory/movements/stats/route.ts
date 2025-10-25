import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Obtener estadísticas de movimientos de inventario
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de consulta
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const product_id = searchParams.get('product_id')
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Construir consulta base
    let query = supabase
      .from('inventory_movements')
      .select('*')
      .eq('organization_id', profile.organization_id)

    // Aplicar filtros de fecha
    if (start_date) {
      query = query.gte('created_at', start_date)
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    // Aplicar filtro de producto
    if (product_id) {
      query = query.eq('product_id', product_id)
    }

    const { data: movements, error } = await query

    if (error) {
      console.error('Error fetching inventory movements for stats:', error)
      return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }

    // Calcular estadísticas
    const stats = {
      total_movements: movements.length,
      entries_count: movements.filter(m => m.movement_type === 'entry').length,
      exits_count: movements.filter(m => m.movement_type === 'exit').length,
      adjustments_count: movements.filter(m => m.movement_type === 'adjustment').length,
      transfers_count: movements.filter(m => m.movement_type === 'transfer').length,
      total_value_in: movements
        .filter(m => m.movement_type === 'entry' || m.movement_type === 'adjustment')
        .reduce((sum, m) => sum + (m.total_cost || 0), 0),
      total_value_out: movements
        .filter(m => m.movement_type === 'exit' || m.movement_type === 'transfer')
        .reduce((sum, m) => sum + (m.total_cost || 0), 0),
      total_quantity_in: movements
        .filter(m => m.movement_type === 'entry' || m.movement_type === 'adjustment')
        .reduce((sum, m) => sum + m.quantity, 0),
      total_quantity_out: movements
        .filter(m => m.movement_type === 'exit' || m.movement_type === 'transfer')
        .reduce((sum, m) => sum + m.quantity, 0)
    }

    // Estadísticas por tipo de referencia
    const referenceStats = {
      purchase_order: movements.filter(m => m.reference_type === 'purchase_order').length,
      work_order: movements.filter(m => m.reference_type === 'work_order').length,
      adjustment: movements.filter(m => m.reference_type === 'adjustment').length,
      transfer: movements.filter(m => m.reference_type === 'transfer').length,
      initial: movements.filter(m => m.reference_type === 'initial').length
    }

    // Movimientos por día (últimos 30 días)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    
    const dailyMovements = movements
      .filter(m => new Date(m.created_at) >= last30Days)
      .reduce((acc, movement) => {
        const date = new Date(movement.created_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = {
            date,
            entries: 0,
            exits: 0,
            adjustments: 0,
            transfers: 0,
            total_value: 0
          }
        }
        
        acc[date][`${movement.movement_type}s`]++
        acc[date].total_value += movement.total_cost || 0
        
        return acc
      }, {} as Record<string, any>)

    const dailyStats = Object.values(dailyMovements).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Productos más movidos
    const productMovements = movements.reduce((acc, movement) => {
      if (!acc[movement.product_id]) {
        acc[movement.product_id] = {
          product_id: movement.product_id,
          total_movements: 0,
          total_quantity: 0,
          total_value: 0
        }
      }
      
      acc[movement.product_id].total_movements++
      acc[movement.product_id].total_quantity += movement.quantity
      acc[movement.product_id].total_value += movement.total_cost || 0
      
      return acc
    }, {} as Record<string, any>)

    const topProducts = Object.values(productMovements)
      .sort((a: any, b: any) => b.total_movements - a.total_movements)
      .slice(0, 10)

    return NextResponse.json({
      data: {
        general: stats,
        by_reference: referenceStats,
        daily: dailyStats,
        top_products: topProducts
      }
    })

  } catch (error) {
    console.error('Error in GET /api/inventory/movements/stats:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}















