import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const imageData = await request.json()
    
    console.log('📝 [API] Agregando imagen a orden:', orderId)
    
    const supabase = createClient()
    
    // Obtener orden actual
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('images')
      .eq('id', orderId)
      .single()
    
    if (fetchError) {
      console.error('❌ [API] Error obteniendo orden:', fetchError)
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }
    
    // Agregar nueva imagen
    const currentImages = order.images || []
    const updatedImages = [...currentImages, imageData]
    
    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({
        images: updatedImages,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (updateError) {
      console.error('❌ [API] Error actualizando:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ [API] Imagen agregada exitosamente')
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('❌ [API] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
