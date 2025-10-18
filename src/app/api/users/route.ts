// TODO: Temporalmente comentado para deploy - withPermission no está implementado
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
