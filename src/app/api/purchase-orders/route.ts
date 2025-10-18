import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllPurchaseOrders, 
  createPurchaseOrder 
} from '@/lib/database/queries/purchase-orders'

// GET /api/purchase-orders - Listar órdenes de compra con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || '00000000-0000-0000-0000-000000000000'
    
    // Construir filtros
    const filters: any = {}
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }
    
    if (searchParams.get('supplier_id')) {
      filters.supplier_id = searchParams.get('supplier_id')
    }
    
    if (searchParams.get('date_from')) {
      filters.date_from = searchParams.get('date_from')
    }
    
    if (searchParams.get('date_to')) {
      filters.date_to = searchParams.get('date_to')
    }
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')
    }
    
    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!)
    }
    
    if (searchParams.get('limit')) {
      filters.limit = parseInt(searchParams.get('limit')!)
    }

    const result = await getAllPurchaseOrders(organizationId, filters)
    
    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/purchase-orders:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener órdenes de compra'
      },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Crear nueva orden de compra
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos requeridos
    const { organization_id, supplier_id } = body
    if (!organization_id || !supplier_id) {
      return NextResponse.json(
        {
          data: null,
          error: 'Faltan datos requeridos: organization_id y supplier_id'
        },
        { status: 400 }
      )
    }

    const newOrder = await createPurchaseOrder(body)

    return NextResponse.json(
      {
        data: newOrder,
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al crear orden de compra'
      },
      { status: 500 }
    )
  }
}

