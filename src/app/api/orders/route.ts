import { NextRequest, NextResponse } from 'next/server'
import { getAllWorkOrders, createWorkOrder } from '@/lib/database/queries/work-orders'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customer_id')
    const vehicleId = searchParams.get('vehicle_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const filters: any = {}
    if (status) filters.status = status
    if (customerId) filters.customer_id = customerId
    if (vehicleId) filters.vehicle_id = vehicleId
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo

    const orders = await getAllWorkOrders(organizationId || undefined, filters)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error in GET /api/orders:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const order = await createWorkOrder(body)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/orders:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}


