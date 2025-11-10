import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/suppliers/stats - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener proveedores
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, is_active')
      .eq('organization_id', tenantContext.organizationId)

    if (suppliersError) {
      console.error('❌ Error obteniendo proveedores:', suppliersError)
      return NextResponse.json({ 
        success: false, 
        error: suppliersError.message 
      }, { status: 500 })
    }

    // Obtener órdenes de compra (si existe la tabla)
    const { data: purchaseOrders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id, total_amount')
      .eq('organization_id', tenantContext.organizationId)

    // Si no existe la tabla, usar valores por defecto
    const orders = ordersError ? [] : (purchaseOrders || [])

    // Calcular estadísticas
    const totalSuppliers = suppliers?.length || 0
    const activeSuppliers = suppliers?.filter(s => s.is_active).length || 0
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

    const stats = {
      totalSuppliers,
      activeSuppliers,
      totalOrders,
      totalAmount
    }

    console.log('✅ Estadísticas calculadas:', stats)
    
    return NextResponse.json({ 
      success: true, 
      data: stats 
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/suppliers/stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}




