'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Pin,
  PinOff,
  Edit,
  Save,
  X,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addNoteToWorkOrder,
  deleteNoteFromWorkOrder,
  updateNoteInWorkOrder
} from '@/lib/database/queries/work-order-notes'
import { WorkOrderNote, NoteCategory } from '@/lib/types/work-orders'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WorkOrderNotesProps {
  orderId: string
  notes: WorkOrderNote[]
  onNotesChange: (notes: WorkOrderNote[]) => void
  userId?: string
  userName?: string
}

const CATEGORY_LABELS: Record<NoteCategory, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-gray-500' },
  important: { label: 'Importante', color: 'bg-red-500' },
  customer: { label: 'Cliente', color: 'bg-blue-500' },
  internal: { label: 'Interno', color: 'bg-purple-500' }
}

// ✅ Función helper para validar y normalizar una nota individual
function isValidNote(note: any): note is WorkOrderNote {
  if (!note || typeof note !== 'object') return false
  if (!note.id || typeof note.id !== 'string') return false
  if (!note.text || typeof note.text !== 'string') return false
  if (!note.createdAt || typeof note.createdAt !== 'string') return false
  // Asegurar que userName sea string (puede ser opcional)
  if (note.userName !== undefined && typeof note.userName !== 'string') return false
  // Asegurar que createdBy sea string si existe (puede ser opcional)
  if (note.createdBy !== undefined && typeof note.createdBy !== 'string') return false
  // Asegurar que category sea válido si existe
  if (note.category !== undefined && !['general', 'important', 'customer', 'internal'].includes(note.category)) return false
  // Asegurar que isPinned sea boolean si existe
  if (note.isPinned !== undefined && typeof note.isPinned !== 'boolean') return false
  return true
}

export function WorkOrderNotes({
  orderId,
  notes,
  onNotesChange,
  userId = 'unknown',
  userName = 'Usuario'
}: WorkOrderNotesProps) {
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>('general')
  const [adding, setAdding] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // ✅ VALIDAR NOTAS AL RECIBIRLAS: Asegurar que todas sean válidas antes de usar
  const validNotes = Array.isArray(notes) ? notes.filter((note, index) => {
    const isValid = isValidNote(note)
    if (!isValid) {
      console.error('❌ [WorkOrderNotes] Nota inválida encontrada en índice', index, ':', note)
    }
    return isValid
  }) : []
  
  // Log si hay notas inválidas
  if (Array.isArray(notes) && validNotes.length !== notes.length) {
    console.warn(`⚠️ [WorkOrderNotes] ${notes.length - validNotes.length} notas inválidas filtradas de ${notes.length} totales`)
  }

  const handleAddNote = async () => {
    console.log('🎯 [handleAddNote] Iniciando...')
    console.log('📝 Texto:', newNoteText)
    console.log('🏷️ Categoría:', newNoteCategory)
    console.log('👤 Usuario:', { userId, userName })
    
    if (!newNoteText.trim()) {
      console.log('⚠️ [handleAddNote] Texto vacío')
      toast.error('Escribe algo en la nota')
      return
    }

    if (!orderId) {
      console.log('❌ [handleAddNote] No hay orderId')
      toast.error('Error: No se encontró el ID de la orden')
      return
    }

    if (!userId) {
      console.log('⚠️ [handleAddNote] No hay userId, usando "unknown"')
    }

    setAdding(true)
    console.log('🔄 [handleAddNote] Estado: adding = true')

    try {
      console.log('📡 [handleAddNote] Llamando a addNoteToWorkOrder...')
      
      const result = await addNoteToWorkOrder(
        orderId,
        newNoteText,
        userId || 'unknown',
        userName || 'Usuario',
        newNoteCategory
      )

      console.log('📦 [handleAddNote] Resultado:', result)

      if (!result.success) {
        console.error('❌ [handleAddNote] Error en resultado:', result.error)
        toast.error(result.error || 'Error al agregar nota')
        setAdding(false)
        return
      }

      if (!result.data) {
        console.error('❌ [handleAddNote] No hay data en resultado')
        toast.error('Error: No se recibió la nota creada')
        setAdding(false)
        return
      }

      console.log('✅ [handleAddNote] Nota recibida:', result.data)

      const updatedNotes = [result.data, ...notes]
      console.log('🔄 [handleAddNote] Actualizando estado con', updatedNotes.length, 'notas')
      
      onNotesChange(updatedNotes)

      console.log('🎉 [handleAddNote] Éxito total')
      toast.success('Nota agregada')
      
      setNewNoteText('')
      setNewNoteCategory('general')
    } catch (error: any) {
      console.error('💥 [handleAddNote] Excepción:', error)
      toast.error(error.message || 'Error al agregar nota')
    } finally {
      console.log('🏁 [handleAddNote] Finalizando, adding = false')
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter para enviar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAddNote()
    }
  }

  const handleDeleteNote = async () => {
    if (!deletingNoteId) return

    try {
      console.log('🔄 [WorkOrderNotes] Eliminando nota:', deletingNoteId)

      const result = await deleteNoteFromWorkOrder(orderId, deletingNoteId)

      if (!result.success) {
        console.error('❌ [WorkOrderNotes] Error eliminando nota:', result.error)
        toast.error(result.error || 'Error al eliminar nota')
        return
      }

      const updatedNotes = notes.filter(note => note.id !== deletingNoteId)
      onNotesChange(updatedNotes)

      console.log('✅ [WorkOrderNotes] Nota eliminada exitosamente')
      toast.success('Nota eliminada')
    } catch (error: any) {
      console.error('❌ [WorkOrderNotes] Error:', error)
      toast.error(error.message || 'Error al eliminar nota')
    } finally {
      setShowDeleteDialog(false)
      setDeletingNoteId(null)
    }
  }

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      console.log('🔄 [WorkOrderNotes] Cambiando estado de fijado:', { noteId, currentPinned })

      const result = await updateNoteInWorkOrder(orderId, noteId, {
        isPinned: !currentPinned
      })

      if (!result.success) {
        console.error('❌ [WorkOrderNotes] Error actualizando nota:', result.error)
        toast.error(result.error || 'Error al actualizar nota')
        return
      }

      const updatedNotes = notes.map(note =>
        note.id === noteId ? { ...note, isPinned: !currentPinned } : note
      )
      onNotesChange(updatedNotes)

      console.log('✅ [WorkOrderNotes] Estado de fijado cambiado exitosamente')
      toast.success(currentPinned ? 'Nota desfijada' : 'Nota fijada')
    } catch (error: any) {
      console.error('❌ [WorkOrderNotes] Error:', error)
      toast.error(error.message || 'Error al actualizar nota')
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editText.trim()) {
      toast.error('La nota no puede estar vacía')
      return
    }

    try {
      console.log('🔄 [WorkOrderNotes] Editando nota:', { noteId, text: editText })

      const result = await updateNoteInWorkOrder(orderId, noteId, {
        text: editText.trim()
      })

      if (!result.success) {
        console.error('❌ [WorkOrderNotes] Error editando nota:', result.error)
        toast.error(result.error || 'Error al actualizar nota')
        return
      }

      const updatedNotes = notes.map(note =>
        note.id === noteId ? { ...note, text: editText.trim() } : note
      )
      onNotesChange(updatedNotes)

      console.log('✅ [WorkOrderNotes] Nota editada exitosamente')
      toast.success('Nota actualizada')
      setEditingNoteId(null)
      setEditText('')
    } catch (error: any) {
      console.error('❌ [WorkOrderNotes] Error:', error)
      toast.error(error.message || 'Error al actualizar nota')
    }
  }

  // Ordenar: fijadas primero, luego por fecha
  const sortedNotes = [...validNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-4">
      {/* Formulario para agregar nota */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">Agregar Nota</h3>
          </div>

          {/* Textarea GRANDE */}
          <Textarea
            placeholder="Escribe una nota sobre esta orden... 

Puedes escribir varios párrafos con toda la información necesaria.
Tip: Ctrl+Enter para enviar rápidamente"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            disabled={adding}
            className="min-h-[150px] resize-y"
          />

          {/* Controles en una fila */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select 
                value={newNoteCategory} 
                onValueChange={(value) => setNewNoteCategory(value as NoteCategory)}
                disabled={adding}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddNote}
              disabled={adding || !newNoteText.trim()}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              {adding ? 'Agregando...' : 'Agregar Nota'}
            </Button>
          </div>

          {/* Contador de caracteres */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Presiona Enter para salto de línea</span>
            <span>{newNoteText.length} caracteres</span>
          </div>
        </div>
      </Card>

      {/* Lista de notas */}
      {sortedNotes.length > 0 ? (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <Card 
              key={note.id} 
              className={`p-4 ${note.isPinned ? 'border-yellow-500 border-2' : ''}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={CATEGORY_LABELS[note.category || 'general']?.color || CATEGORY_LABELS.general.color}>
                      {CATEGORY_LABELS[note.category || 'general']?.label || CATEGORY_LABELS.general.label}
                    </Badge>
                    {note.isPinned && (
                      <Badge variant="outline" className="border-yellow-500">
                        <Pin className="h-3 w-3 mr-1" />
                        Fijada
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleTogglePin(note.id, note.isPinned || false)}
                      title={note.isPinned ? 'Desfijar nota' : 'Fijar nota'}
                    >
                      {note.isPinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>

                    {editingNoteId === note.id ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditNote(note.id)}
                          title="Guardar cambios"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingNoteId(null)
                            setEditText('')
                          }}
                          title="Cancelar edición"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingNoteId(note.id)
                            setEditText(note.text)
                          }}
                          title="Editar nota"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingNoteId(note.id)
                            setShowDeleteDialog(true)
                          }}
                          title="Eliminar nota"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contenido */}
                {editingNoteId === note.id ? (
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={5}
                    placeholder="Escribe el contenido de la nota..."
                    className="min-h-[120px] resize-y"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{note.userName}</span>
                  <span>•</span>
                  <span>
                    {format(new Date(note.createdAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-2" />
            <p>No hay notas</p>
            <p className="text-sm">Agrega la primera nota sobre esta orden</p>
          </div>
        </Card>
      )}

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La nota será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
