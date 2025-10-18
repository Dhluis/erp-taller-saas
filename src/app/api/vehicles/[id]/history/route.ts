import { NextRequest, NextResponse } from 'next/server'
import { getVehicleWithHistory } from '@/lib/database/queries/vehicles'

// GET /api/vehicles/[id]/history - Historial de servicios del vehículo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleWithHistory = await getVehicleWithHistory(params.id)
    
    if (!vehicleWithHistory) {
      return NextResponse.json(
        {
          data: null,
          error: 'Vehículo no encontrado'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      data: {
        vehicle: {
          id: vehicleWithHistory.id,
          brand: vehicleWithHistory.brand,
          model: vehicleWithHistory.model,
          year: vehicleWithHistory.year,
          license_plate: vehicleWithHistory.license_plate,
          vin: vehicleWithHistory.vin,
          color: vehicleWithHistory.color,
          mileage: vehicleWithHistory.mileage,
          customer: vehicleWithHistory.customers
        },
        history: {
          work_orders: vehicleWithHistory.work_orders,
          quotations: vehicleWithHistory.quotations,
          work_orders_count: vehicleWithHistory.work_orders_count,
          quotations_count: vehicleWithHistory.quotations_count,
          total_spent: vehicleWithHistory.total_spent
        },
        summary: {
          total_services: vehicleWithHistory.work_orders_count,
          total_quotations: vehicleWithHistory.quotations_count,
          total_amount_spent: vehicleWithHistory.total_spent,
          last_service: vehicleWithHistory.work_orders[0] || null,
          last_quotation: vehicleWithHistory.quotations[0] || null
        }
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/vehicles/[id]/history:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al obtener historial del vehículo'
      },
      { status: 500 }
    )
  }
}


