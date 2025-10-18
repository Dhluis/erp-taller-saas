// TODO: Temporalmente comentado para deploy - withPermission no está implementado
import { NextResponse } from 'next/server'

// Ruta temporalmente deshabilitada
export async function GET() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
