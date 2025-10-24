import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔵 [API] Request recibida para work-orders')
  console.log('🔵 [API] Order ID:', params.id)
  
  try {
    const orderId = params.id
    
    console.log('🔵 [API] Parseando body...')
    const imageData = await request.json()
    console.log('🔵 [API] Image data recibida')
    
    console.log('🔵 [API] Creando cliente Supabase...')
    const supabase = await createClient()
    
    console.log('🔵 [API] Obteniendo orden...')
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('images')
      .eq('id', orderId)
      .single()
    
    if (fetchError) {
      console.error('❌ [API] Error fetch:', fetchError)
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }
    
    console.log('🔵 [API] Orden obtenida, actualizando...')
    
    const currentImages = order?.images || []
    const updatedImages = [...currentImages, imageData]
    
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (updateError) {
      console.error('❌ [API] Error update:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ [API] Imagen agregada exitosamente')
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ [API] Exception:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
