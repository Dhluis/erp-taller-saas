import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InventoryMovementUpdate } from '@/types/supabase-simple'
import { z } from 'zod'

// Schema de validación para actualizar movimiento
const updateMovementSchema = z.object({
  notes: z.string().optional(),
  unit_cost: z.number().positive().optional(),
  total_cost: z.number().positive().optional()
})

// GET - Obtener movimiento específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Obtener movimiento con datos relacionados
    const { data: movement, error } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        products (
          id,
          name,
          category_id,
          inventory_categories (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
      }
      console.error('Error fetching inventory movement:', error)
      return NextResponse.json({ error: 'Error al obtener movimiento' }, { status: 500 })
    }

    return NextResponse.json({ data: movement })

  } catch (error) {
    console.error('Error in GET /api/inventory/movements/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar movimiento (solo campos permitidos)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Validar datos del request
    const body = await request.json()
    const validatedData = updateMovementSchema.parse(body)

    // Verificar que el movimiento existe y pertenece a la organización
    const { data: existingMovement, error: fetchError } = await supabase
      .from('inventory_movements')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
      }
      console.error('Error fetching movement:', fetchError)
      return NextResponse.json({ error: 'Error al obtener movimiento' }, { status: 500 })
    }

    // Actualizar movimiento (solo campos permitidos)
    const { data: updatedMovement, error: updateError } = await supabase
      .from('inventory_movements')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating inventory movement:', updateError)
      return NextResponse.json({ error: 'Error al actualizar movimiento' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedMovement,
      message: 'Movimiento actualizado exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/inventory/movements/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar movimiento (solo si es un ajuste reciente)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('system_users')
      .select('organization_id')
      .eq('email', user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })
    }

    // Verificar que el movimiento existe y pertenece a la organización
    const { data: movement, error: fetchError } = await supabase
      .from('inventory_movements')
      .select('id, movement_type, created_at, product_id, quantity, previous_stock')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
      }
      console.error('Error fetching movement:', fetchError)
      return NextResponse.json({ error: 'Error al obtener movimiento' }, { status: 500 })
    }

    // Solo permitir eliminar ajustes y solo si son recientes (menos de 24 horas)
    const createdAt = new Date(movement.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (movement.movement_type !== 'adjustment') {
      return NextResponse.json({ 
        error: 'Solo se pueden eliminar movimientos de tipo ajuste' 
      }, { status: 400 })
    }

    if (hoursDiff > 24) {
      return NextResponse.json({ 
        error: 'Solo se pueden eliminar ajustes creados en las últimas 24 horas' 
      }, { status: 400 })
    }

    // Eliminar movimiento
    const { error: deleteError } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting inventory movement:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar movimiento' }, { status: 500 })
    }

    // Revertir el stock del producto
    const { error: stockError } = await supabase
      .from('products')
      .update({ 
        stock: movement.previous_stock,
        updated_at: new Date().toISOString()
      })
      .eq('id', movement.product_id)

    if (stockError) {
      console.error('Error reverting product stock:', stockError)
      // No devolver error aquí ya que el movimiento ya se eliminó
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in DELETE /api/inventory/movements/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
