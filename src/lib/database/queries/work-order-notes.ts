import { createClient } from '@/lib/supabase/client'
import { WorkOrderNote, NoteCategory } from '@/lib/types/work-orders'

const supabase = createClient()

/**
 * Agregar nota a una orden
 */
export async function addNoteToWorkOrder(
  orderId: string,
  text: string,
  userId: string,
  userName: string,
  category: NoteCategory = 'general',
  isPinned: boolean = false
): Promise<{ success: boolean; data?: WorkOrderNote; error?: string }> {
  try {
    console.log('1️⃣ [addNote] Iniciando...', { orderId, userId, category })
    
    if (!text.trim()) {
      console.log('❌ [addNote] Texto vacío')
      return { success: false, error: 'El texto de la nota no puede estar vacío' }
    }

    // Crear nueva nota
    const newNote: WorkOrderNote = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
      createdBy: userId,
      userName,
      isPinned,
      category
    }
    
    console.log('2️⃣ [addNote] Nota creada:', newNote)

    // Obtener notas actuales
    console.log('3️⃣ [addNote] Obteniendo orden actual...')
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('notes')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('❌ [addNote] Error obteniendo orden:', fetchError)
      return { success: false, error: fetchError.message }
    }
    
    console.log('4️⃣ [addNote] Orden obtenida:', order)
    console.log('5️⃣ [addNote] Notas actuales:', order.notes)

    const currentNotes = order.notes || []
    const updatedNotes = [newNote, ...currentNotes]
    
    console.log('6️⃣ [addNote] Notas actualizadas (total):', updatedNotes.length)

    // Actualizar orden
    console.log('7️⃣ [addNote] Actualizando orden en BD...')
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ [addNote] Error actualizando:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log('✅ [addNote] Nota agregada exitosamente')
    return { success: true, data: newNote }
    
  } catch (error: any) {
    console.error('💥 [addNote] Excepción:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Eliminar nota de una orden
 */
export async function deleteNoteFromWorkOrder(
  orderId: string,
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 [deleteNoteFromWorkOrder] Eliminando nota:', { orderId, noteId })

    // Obtener notas actuales
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('notes')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('❌ [deleteNoteFromWorkOrder] Error obteniendo orden:', fetchError)
      return { success: false, error: fetchError.message }
    }

    const currentNotes = order.notes || []
    const updatedNotes = currentNotes.filter(
      (note: WorkOrderNote) => note.id !== noteId
    )

    console.log('🔄 [deleteNoteFromWorkOrder] Notas antes:', currentNotes.length)
    console.log('🔄 [deleteNoteFromWorkOrder] Notas después:', updatedNotes.length)

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ [deleteNoteFromWorkOrder] Error actualizando orden:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log('✅ [deleteNoteFromWorkOrder] Nota eliminada exitosamente')
    return { success: true }
  } catch (error: any) {
    console.error('❌ [deleteNoteFromWorkOrder] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualizar nota (editar o fijar/desfijar)
 */
export async function updateNoteInWorkOrder(
  orderId: string,
  noteId: string,
  updates: Partial<Pick<WorkOrderNote, 'text' | 'isPinned' | 'category'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 [updateNoteInWorkOrder] Actualizando nota:', { orderId, noteId, updates })

    // Obtener notas actuales
    const { data: order, error: fetchError } = await supabase
      .from('work_orders')
      .select('notes')
      .eq('id', orderId)
      .single()

    if (fetchError) {
      console.error('❌ [updateNoteInWorkOrder] Error obteniendo orden:', fetchError)
      return { success: false, error: fetchError.message }
    }

    const currentNotes = order.notes || []
    const updatedNotes = currentNotes.map((note: WorkOrderNote) =>
      note.id === noteId ? { ...note, ...updates } : note
    )

    // Verificar que la nota existe
    const noteExists = currentNotes.some((note: WorkOrderNote) => note.id === noteId)
    if (!noteExists) {
      console.error('❌ [updateNoteInWorkOrder] Nota no encontrada:', noteId)
      return { success: false, error: 'Nota no encontrada' }
    }

    console.log('🔄 [updateNoteInWorkOrder] Nota actualizada en memoria')

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ [updateNoteInWorkOrder] Error actualizando orden:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log('✅ [updateNoteInWorkOrder] Nota actualizada exitosamente')
    return { success: true }
  } catch (error: any) {
    console.error('❌ [updateNoteInWorkOrder] Error:', error)
    return { success: false, error: error.message }
  }
}
