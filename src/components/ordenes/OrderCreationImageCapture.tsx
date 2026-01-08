'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  X, 
  Image as ImageIcon,
  Loader2,
  Camera
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export interface TemporaryImage {
  file: File
  preview: string
  description?: string
}

interface OrderCreationImageCaptureProps {
  images: TemporaryImage[]
  onImagesChange: (images: TemporaryImage[]) => void
  maxImages?: number
  disabled?: boolean
}

/**
 * Componente simplificado para capturar fotos durante la creación de órdenes
 * Replica la estrategia de WorkOrderImageManager de KANBAN
 */
export function OrderCreationImageCapture({
  images,
  onImagesChange,
  maxImages = 20,
  disabled = false
}: OrderCreationImageCaptureProps) {
  const [uploading, setUploading] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detectar si es dispositivo móvil
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Limpiar previews cuando el componente se desmonte
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Verificar límite
    if (images.length + files.length > maxImages) {
      toast.error(`Solo puedes agregar hasta ${maxImages} fotos`)
      // Agregar solo las que quepan
      const filesToAdd = Array.from(files).slice(0, maxImages - images.length)
      processFiles(filesToAdd)
    } else {
      processFiles(Array.from(files))
    }

    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = ''
  }

  // ✅ OPTIMIZACIÓN MÓVIL ULTRA-AGRESIVA: Comprimir imágenes antes de crear preview
  const compressImageForPreview = (file: File): Promise<{ compressed: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const isMobile = typeof window !== 'undefined' && 
        (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth < 768)
      
      // ✅ OPTIMIZACIÓN ULTRA-AGRESIVA MÓVIL: Reducir aún más para subida rápida
      const MAX_SIZE = isMobile ? 800 : 1600  // Móvil: 800px (reducido de 1200px), Desktop: 1600px
      const QUALITY = isMobile ? 0.5 : 0.85  // Móvil: 50% calidad (reducido de 70%), Desktop: 85%
      
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.src = e.target?.result as string
        
        img.onload = () => {
          let width = img.width
          let height = img.height
          
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            } else {
              width = Math.round((width * MAX_SIZE) / height)
              height = MAX_SIZE
            }
          }
          
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          // ✅ Optimización: Mejor calidad de renderizado
          ctx?.imageSmoothingEnabled && (ctx.imageSmoothingEnabled = true)
          ctx?.imageSmoothingQuality && (ctx.imageSmoothingQuality = 'high')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                const preview = URL.createObjectURL(compressedFile)
                
                // ✅ Log para debugging (solo en desarrollo)
                if (process.env.NODE_ENV === 'development') {
                  const originalSize = (file.size / 1024 / 1024).toFixed(2)
                  const compressedSize = (blob.size / 1024 / 1024).toFixed(2)
                  console.log(`📸 Imagen comprimida: ${originalSize}MB → ${compressedSize}MB (${((1 - blob.size / file.size) * 100).toFixed(0)}% reducción)`)
                }
                
                resolve({ compressed: compressedFile, preview })
              } else {
                reject(new Error('Error al comprimir imagen'))
              }
            },
            'image/jpeg',
            QUALITY
          )
        }
        
        img.onerror = () => reject(new Error('Error al cargar imagen'))
      }
      
      reader.onerror = () => reject(new Error('Error al leer archivo'))
    })
  }

  const processFiles = async (files: File[]) => {
    setUploading(true)
    try {
      const newImages: TemporaryImage[] = []

      for (const file of files) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} no es una imagen válida`)
          continue
        }

        // ✅ OPTIMIZACIÓN MÓVIL: Límite más estricto en móvil
        const maxSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024  // Móvil: 5MB, Desktop: 10MB
        if (file.size > maxSize) {
          toast.error(`${file.name} es muy grande (máximo ${isMobile ? '5MB' : '10MB'})`)
          continue
        }

        try {
          // ✅ OPTIMIZACIÓN: Comprimir imagen antes de crear preview
          const { compressed, preview } = await compressImageForPreview(file)
          newImages.push({
            file: compressed,  // Usar archivo comprimido
            preview
          })
        } catch (error) {
          console.error('Error comprimiendo imagen:', error)
          // Fallback: usar archivo original si falla compresión
          const preview = URL.createObjectURL(file)
          newImages.push({
            file,
            preview
          })
        }
      }

      onImagesChange([...images, ...newImages])
    } catch (error: any) {
      console.error('Error procesando imágenes:', error)
      toast.error('Error al procesar las imágenes')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index]
    if (imageToRemove.preview) {
      URL.revokeObjectURL(imageToRemove.preview)
    }
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos del Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3">
            {/* Botón: Tomar Foto - Estilo azul como KANBAN */}
            <Button
              type="button"
              onClick={() => {
                console.log('📸 [OrderCreation] Tomar Foto clickeado')
                cameraInputRef.current?.click()
              }}
              disabled={uploading || images.length >= maxImages || disabled}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-300"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Tomar Foto
                </>
              )}
            </Button>

            {/* Botón: Desde Galería */}
            <Button
              type="button"
              onClick={() => {
                console.log('📁 [OrderCreation] Galería clickeada')
                fileInputRef.current?.click()
              }}
              disabled={uploading || images.length >= maxImages || disabled}
              className="w-full"
              variant="outline"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Desde Galería
                </>
              )}
            </Button>
          </div>

          {/* Contador de imágenes */}
          <div className="text-xs text-muted-foreground text-center">
            {images.length}/{maxImages} fotos
          </div>

          {/* Mensaje informativo sobre la cámara */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-yellow-500">💡</span>
            <span><strong>Tomar Foto:</strong> Abre cámara directa del dispositivo</span>
          </div>

          {/* Input oculto para CÁMARA */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || images.length >= maxImages || disabled}
          />

          {/* Input oculto para GALERÍA - Permite múltiples archivos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || images.length >= maxImages || disabled}
          />
        </CardContent>
      </Card>

      {/* Preview de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card 
              key={index} 
              className="relative group overflow-hidden"
            >
              <div className="aspect-square relative">
                <Image
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  loading="lazy"  // ✅ OPTIMIZACIÓN: Lazy loading
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              </div>
              
              {/* Botón eliminar */}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No hay fotos aún</p>
            <p className="text-xs mt-1">Documenta el estado del vehículo con fotos</p>
          </div>
        </Card>
      )}
    </div>
  )
}

