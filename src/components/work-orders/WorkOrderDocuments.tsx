'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Upload, 
  Trash2, 
  Download, 
  FileText,
  Eye,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  uploadDocument, 
  deleteDocument,
  formatFileSize,
  getFileIcon,
  getCategoryColor,
  getCategoryLabel,
  type WorkOrderDocument 
} from '@/lib/supabase/work-order-documents'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface WorkOrderDocumentsProps {
  workOrderId: string
  userId: string
  initialDocuments?: WorkOrderDocument[]
  onUpdate?: () => void
}

export default function WorkOrderDocuments({
  workOrderId,
  userId,
  initialDocuments = [],
  onUpdate
}: WorkOrderDocumentsProps) {
  const [documents, setDocuments] = useState<WorkOrderDocument[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<WorkOrderDocument['category']>('other')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<WorkOrderDocument | null>(null)
  const [previewDocument, setPreviewDocument] = useState<WorkOrderDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📤 Iniciando subida de documento:', file.name)
    setUploading(true)

    try {
      const newDocument = await uploadDocument(
        workOrderId,
        file,
        selectedCategory,
        userId
      )
      
      console.log('✅ Documento subido:', newDocument)
      setDocuments(prev => [...prev, newDocument])
      toast.success('Documento subido correctamente')
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notificar al padre para actualizar
      onUpdate?.()
    } catch (error: any) {
      console.error('❌ Error uploading document:', error)
      toast.error(error.message || 'Error al subir documento')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!documentToDelete) return

    console.log('🗑️ Eliminando documento:', documentToDelete.name)

    try {
      await deleteDocument(workOrderId, documentToDelete.id)
      setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id))
      toast.success('Documento eliminado')
      
      // Notificar al padre para actualizar
      onUpdate?.()
    } catch (error: any) {
      console.error('❌ Error deleting document:', error)
      toast.error('Error al eliminar documento')
    } finally {
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleDownload = async (doc: WorkOrderDocument) => {
    console.log('⬇️ Descargando documento:', doc.name)
    
    try {
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Descargando documento...')
    } catch (error) {
      console.error('❌ Error downloading document:', error)
      toast.error('Error al descargar documento')
    }
  }

  const handlePreview = (doc: WorkOrderDocument) => {
    if (doc.type === 'application/pdf' || doc.type.startsWith('image/')) {
      console.log('👁️ Abriendo preview:', doc.name)
      setPreviewDocument(doc)
    } else {
      toast.info('Vista previa no disponible para este tipo de archivo')
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="p-4 border-dashed bg-accent/30">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as WorkOrderDocument['category'])}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">📄 Factura</SelectItem>
              <SelectItem value="quotation">📋 Cotización</SelectItem>
              <SelectItem value="receipt">🧾 Recibo</SelectItem>
              <SelectItem value="contract">📜 Contrato</SelectItem>
              <SelectItem value="warranty">🛡️ Garantía</SelectItem>
              <SelectItem value="photo">📸 Foto</SelectItem>
              <SelectItem value="report">📊 Reporte</SelectItem>
              <SelectItem value="other">📎 Otro</SelectItem>
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir Documento
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, TXT (Máx. 50MB)
        </p>
      </Card>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">No hay documentos adjuntos</p>
            <p className="text-sm">Sube facturas, cotizaciones o cualquier documento relacionado</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(doc.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </p>
                  </div>
                </div>
              </div>

              <Badge className={`mb-3 text-xs ${getCategoryColor(doc.category)}`}>
                {getCategoryLabel(doc.category)}
              </Badge>

              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(doc)}
                  className="flex-1"
                  title="Ver documento"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                  className="flex-1"
                  title="Descargar documento"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Bajar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDocumentToDelete(doc)
                    setDeleteDialogOpen(true)
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Eliminar documento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {format(new Date(doc.uploaded_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0F172A] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta acción no se puede deshacer. El documento será eliminado permanentemente.
              <br />
              <br />
              <strong className="text-white">{documentToDelete?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {previewDocument && (
        <AlertDialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] p-0 bg-[#0F172A] border-gray-700">
            <AlertDialogHeader className="p-6 pb-4">
              <AlertDialogTitle className="text-white">{previewDocument.name}</AlertDialogTitle>
              <Badge className={`w-fit ${getCategoryColor(previewDocument.category)}`}>
                {getCategoryLabel(previewDocument.category)}
              </Badge>
            </AlertDialogHeader>
            
            <div className="px-6 pb-6 overflow-auto max-h-[calc(90vh-180px)]">
              {previewDocument.type === 'application/pdf' ? (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-[600px] border-0 rounded-lg"
                  title={previewDocument.name}
                />
              ) : previewDocument.type.startsWith('image/') ? (
                <img
                  src={previewDocument.url}
                  alt={previewDocument.name}
                  className="w-full h-auto rounded-lg"
                />
              ) : null}
            </div>

            <AlertDialogFooter className="p-6 pt-4">
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDownload(previewDocument)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

