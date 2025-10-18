import { NextRequest, NextResponse } from 'next/server'
import { verifyBackupIntegrity } from '@/lib/backup/service'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/backups/[id]/verify - Verificar integridad del backup
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'backups', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await verifyBackupIntegrity(params.id)

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

    console.error('Error in GET /api/backups/[id]/verify:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

