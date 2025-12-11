import { NextRequest, NextResponse } from 'next/server'
import { calculateOrderTotals } from '@/lib/database/queries/order-items'
import { getOrganizationId } from '@/lib/auth/organization-server'

// POST /api/orders/[id]/totals - Recalcular totales de una orden
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Obtener contexto del usuario autenticado
    const organizationId = await getOrganizationId(request)
    
    if (!organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }

    const result = await calculateOrderTotals(params.id, organizationId)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in POST /api/orders/[id]/totals:', error)
    
    // Si es error de autenticación, retornar 401
    if (error?.message?.includes('no autenticado') || error?.message?.includes('autenticado')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET /api/orders/[id]/totals - Obtener totales calculados de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Obtener contexto del usuario autenticado
    const organizationId = await getOrganizationId(request)
    
    if (!organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }

    const result = await calculateOrderTotals(params.id, organizationId)
    return NextResponse.json({
      subtotal: result.subtotal,
      tax_amount: result.tax_amount,
      discount_amount: result.discount_amount,
      total_amount: result.total_amount,
      items_count: result.items_count
    })
  } catch (error: any) {
    console.error('Error in GET /api/orders/[id]/totals:', error)
    
    // Si es error de autenticación, retornar 401
    if (error?.message?.includes('no autenticado') || error?.message?.includes('autenticado')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


