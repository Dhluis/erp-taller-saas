import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllPurchaseOrders, 
  createPurchaseOrder 
} from '@/lib/database/queries/purchase-orders'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

// GET /api/purchase-orders - Listar órdenes de compra con filtros
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: organización no encontrada'
        },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const { searchParams } = new URL(request.url)
    
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
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: organización no encontrada'
        },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const body = await request.json()

    // Validar datos requeridos
    const { supplier_id } = body
    if (!supplier_id) {
      return NextResponse.json(
        {
          data: null,
          error: 'Faltan datos requeridos: supplier_id'
        },
        { status: 400 }
      )
    }

    // ✅ FORZAR organization_id del usuario autenticado (ignorar el del body)
    body.organization_id = organizationId

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

