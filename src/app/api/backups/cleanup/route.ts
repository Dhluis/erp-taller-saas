import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldBackups } from '@/lib/database/queries/backups'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// POST /api/backups/cleanup - Limpiar backups antiguos
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'backups', 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || user.organization_id
    const keepCount = parseInt(searchParams.get('keep_count') || '30')

    const result = await cleanupOldBackups(organizationId, keepCount)

    return NextResponse.json({
      data: result,
      error: null
    })
  } catch (error: any) {
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in POST /api/backups/cleanup:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

