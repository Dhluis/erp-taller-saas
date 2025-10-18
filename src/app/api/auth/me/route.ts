// TODO: Temporalmente comentado para deploy - getAuthenticatedUser no está implementado
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
