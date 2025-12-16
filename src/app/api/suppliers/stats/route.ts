import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/suppliers/stats - Iniciando...')
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 403 })
    }

    const organizationId = userProfile.organization_id;
    
    // ✅ Usar Service Role Client directamente para queries (bypass RLS)
    // Obtener proveedores
    const { data: suppliers, error: suppliersError } = await supabaseAdmin
      .from('suppliers')
      .select('id, is_active')
      .eq('organization_id', organizationId)

    if (suppliersError) {
      console.error('❌ Error obteniendo proveedores:', suppliersError)
      return NextResponse.json({ 
        success: false, 
        error: suppliersError.message 
      }, { status: 500 })
    }

    // Obtener órdenes de compra (si existe la tabla)
    const { data: purchaseOrders, error: ordersError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, total_amount')
      .eq('organization_id', organizationId)

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








