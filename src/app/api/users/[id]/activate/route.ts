// TODO: Temporalmente comentado para deploy - withPermission no está implementado
import { NextResponse } from 'next/server'

export async function PUT() {
  return NextResponse.json({ error: 'Ruta en desarrollo' }, { status: 501 })
}
