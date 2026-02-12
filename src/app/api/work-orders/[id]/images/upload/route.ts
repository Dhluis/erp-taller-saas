/**
 * POST /api/work-orders/[id]/images/upload
 * Sube archivos a Supabase Storage con service role y persiste en work_orders.images.
 * Usar este endpoint al crear una orden para evitar problemas de permisos RLS en Storage.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

const BUCKET = 'work-order-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 })
    }

    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select('id, images, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: fetchError?.message || 'Orden no encontrada o no autorizada' },
        { status: fetchError ? 500 : 404 }
      )
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Se espera multipart/form-data con archivos' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const filesSingle = formData.getAll('file') as File[]
    const allFiles = files.length ? files : filesSingle

    if (!allFiles.length) {
      return NextResponse.json(
        { error: 'No se recibieron archivos. Usa el campo "files" o "file".' },
        { status: 400 }
      )
    }

    const currentImages = (order.images as any[]) || []
    const added: { path: string; url: string; uploadedAt: string }[] = []
    const errors: string[] = []

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      if (!(file instanceof File)) continue
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: no es una imagen`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: supera 10MB`)
        continue
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const storagePath = `${organizationId}/${orderId}/reception-${timestamp}-${random}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.warn('[images/upload] Error subiendo:', storagePath, uploadError)
        errors.push(`${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      const pathForDb = `${BUCKET}/${storagePath}`
      const uploadedAt = new Date().toISOString()

      added.push({
        path: pathForDb,
        url: urlData.publicUrl,
        uploadedAt,
      })
    }

    if (added.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.length ? errors.join('. ') : 'No se pudo subir ninguna imagen',
        },
        { status: 400 }
      )
    }

    const updatedImages = [...currentImages, ...added]

    const { error: updateError } = await supabaseAdmin
      .from('work_orders')
      .update({
        images: updatedImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId)

    if (updateError) {
      console.error('[images/upload] Error actualizando work_orders:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: added.length,
      failed: errors.length,
      message: errors.length
        ? `Se subieron ${added.length} foto(s). ${errors.length} fallaron.`
        : undefined,
    })
  } catch (err: any) {
    console.error('[images/upload] Exception:', err)
    return NextResponse.json(
      { error: err?.message || 'Error al subir imágenes' },
      { status: 500 }
    )
  }
}
