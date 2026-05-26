import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'company-assets'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = getSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo en el campo "file"' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const orgId = tenantContext.organizationId
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const storagePath = `logos/${orgId}/logo_${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error('[logo-upload] Upload error:', uploadError)
      return NextResponse.json({ error: `Error al subir imagen: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (err: any) {
    console.error('[logo-upload] Exception:', err)
    return NextResponse.json({ error: err?.message || 'Error al procesar la imagen' }, { status: 500 })
  }
}
