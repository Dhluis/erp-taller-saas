import { NextResponse } from 'next/server'

/**
 * Conversión de documentos - Temporalmente deshabilitado
 * TODO: Implementar cuando se necesite la funcionalidad
 */

export async function POST() {
  return NextResponse.json(
    { 
      success: false,
      message: 'Esta funcionalidad estará disponible próximamente',
      error: 'Endpoint en desarrollo'
    },
    { status: 501 }
  )
}

export async function GET() {
  return NextResponse.json(
    { 
      success: false,
      message: 'Esta funcionalidad estará disponible próximamente'
    },
    { status: 501 }
  )
}
