# 🚀 Plan de Implementación: Optimización de Imágenes

## 📋 Estrategia Propuesta

### **Fase 1: Quick Wins (Impacto Inmediato - 1-2 días)**
Implementar mejoras que no requieren cambios en servidor.

### **Fase 2: Optimización de Servidor (Impacto a Largo Plazo - 3-5 días)**
Implementar generación de thumbnails y optimizaciones avanzadas.

---

## 🎯 FASE 1: Quick Wins

### **1.1 Lazy Loading con Intersection Observer**

**Objetivo:** Cargar solo imágenes visibles en viewport

**Implementación:**
- Crear hook `useIntersectionObserver` para detectar visibilidad
- Modificar `WorkOrderImageManager` para usar lazy loading
- Agregar skeleton loaders mientras cargan

**Beneficio:** 70-80% reducción en carga inicial

---

### **1.2 Paginación de Imágenes**

**Objetivo:** Mostrar 6-9 imágenes iniciales, cargar más bajo demanda

**Implementación:**
- Agregar estado de paginación (página actual, items por página)
- Botón "Ver más" para cargar siguiente página
- Mantener imágenes cargadas en memoria (no re-renderizar)

**Beneficio:** 60-70% reducción en renderizado inicial

---

### **1.3 Skeleton Loaders**

**Objetivo:** Mejor UX mientras cargan imágenes

**Implementación:**
- Componente `ImageSkeleton` reutilizable
- Mostrar skeleton mientras `loading` es true
- Transición suave cuando carga la imagen

**Beneficio:** Percepción de velocidad mejorada

---

## 🔧 FASE 2: Optimización de Servidor

### **2.1 Generación de Thumbnails**

**Objetivo:** Crear thumbnails de 200x200px al subir imagen

**Implementación:**
- Modificar API route `/api/work-orders/[id]/images` para generar thumbnails
- Usar Sharp (Node.js) o ImageMagick para redimensionar
- Almacenar thumbnail en Supabase Storage: `thumbnails/{orderId}/{imageId}.jpg`
- Retornar URL de thumbnail junto con URL completa

**Beneficio:** 90% reducción de ancho de banda en grid

---

### **2.2 Estrategia de Carga Inteligente**

**Objetivo:** Usar thumbnail en grid, imagen completa en modal

**Implementación:**
- Modificar `WorkOrderImage` interface para incluir `thumbnailUrl`
- Usar `thumbnailUrl` en grid de miniaturas
- Cargar `url` completa solo al abrir modal o hacer hover

**Beneficio:** Experiencia instantánea en grid

---

## 💻 Código Propuesto

### **Hook: useIntersectionObserver**

```typescript
// src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setHasIntersected(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [options])

  return { ref, isIntersecting, hasIntersected }
}
```

---

### **Componente: LazyImage**

```typescript
// src/components/ui/LazyImage.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  sizes?: string
  priority?: boolean
}

export function LazyImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority = false
}: LazyImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { ref, hasIntersected } = useIntersectionObserver()

  // Si es priority, cargar inmediatamente
  const shouldLoad = priority || hasIntersected

  return (
    <div ref={ref} className={className}>
      {!imageLoaded && (
        <Skeleton className={fill ? 'absolute inset-0' : `w-full h-full`} />
      )}
      {shouldLoad && (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={width}
          height={height}
          sizes={sizes}
          className={`${className} transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading={priority ? undefined : 'lazy'}
        />
      )}
    </div>
  )
}
```

---

### **Hook: useImagePagination**

```typescript
// src/hooks/useImagePagination.ts
import { useState, useMemo } from 'react'

interface UseImagePaginationOptions {
  itemsPerPage?: number
  initialPage?: number
}

export function useImagePagination<T>(
  items: T[],
  options: UseImagePaginationOptions = {}
) {
  const { itemsPerPage = 6, initialPage = 1 } = options
  const [currentPage, setCurrentPage] = useState(initialPage)

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return items.slice(0, startIndex + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const hasMore = currentPage < totalPages
  const showing = paginatedItems.length
  const total = items.length

  const loadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const reset = () => {
    setCurrentPage(initialPage)
  }

  return {
    paginatedItems,
    currentPage,
    totalPages,
    hasMore,
    showing,
    total,
    loadMore,
    reset
  }
}
```

---

### **Modificación: WorkOrderImageManager con Optimizaciones**

```typescript
// Cambios propuestos en WorkOrderImageManager.tsx

import { useImagePagination } from '@/hooks/useImagePagination'
import { LazyImage } from '@/components/ui/LazyImage'

// Dentro del componente:
const {
  paginatedItems: paginatedImages,
  hasMore,
  showing,
  total,
  loadMore
} = useImagePagination(categoryImages, { itemsPerPage: 6 })

// Reemplazar Image con LazyImage:
<LazyImage
  src={image.thumbnailUrl || image.url} // Usar thumbnail si existe
  alt={image.description || image.name}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 50vw, 20vw"
/>

// Agregar botón "Ver más":
{hasMore && (
  <Button onClick={loadMore} variant="outline" className="w-full">
    Ver más ({total - showing} restantes)
  </Button>
)}
```

---

### **API Route: Generación de Thumbnails**

```typescript
// Modificación en src/app/api/work-orders/[id]/images/route.ts

import sharp from 'sharp' // npm install sharp

// Función helper para generar thumbnail
async function generateThumbnail(
  imageBuffer: Buffer,
  orderId: string,
  imageId: string
): Promise<string> {
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(200, 200, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer()

  const thumbnailPath = `${orderId}/thumbnails/${imageId}.jpg`
  
  const { error } = await supabaseAdmin.storage
    .from('work-order-images')
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (error) throw error

  const { data: urlData } = supabaseAdmin.storage
    .from('work-order-images')
    .getPublicUrl(thumbnailPath)

  return urlData.publicUrl
}

// En el POST handler, después de subir imagen:
const thumbnailUrl = await generateThumbnail(
  await file.arrayBuffer(),
  orderId,
  imageId
)

// Incluir thumbnailUrl en la respuesta
return {
  ...imageData,
  thumbnailUrl
}
```

---

## 📦 Dependencias Necesarias

```json
{
  "sharp": "^0.33.0"  // Para generación de thumbnails en servidor
}
```

---

## 🎯 Orden de Implementación Recomendado

### **Día 1: Lazy Loading + Paginación**
1. ✅ Crear `useIntersectionObserver` hook
2. ✅ Crear `LazyImage` component
3. ✅ Crear `useImagePagination` hook
4. ✅ Modificar `WorkOrderImageManager` para usar ambos
5. ✅ Agregar skeleton loaders

**Resultado:** 70-80% mejora inmediata en carga inicial

---

### **Día 2-3: Thumbnails (Opcional pero Recomendado)**
1. ✅ Instalar `sharp`
2. ✅ Crear función `generateThumbnail` en API route
3. ✅ Modificar POST handler para generar thumbnails
4. ✅ Actualizar interface `WorkOrderImage` para incluir `thumbnailUrl`
5. ✅ Modificar `LazyImage` para usar thumbnail en grid

**Resultado:** 90% reducción de ancho de banda en grid

---

## 🔄 Alternativa Sin Thumbnails (Más Simple)

Si no quieres implementar generación de thumbnails en servidor, puedes:

1. **Usar `next/image` con `sizes` más pequeños en grid:**
```typescript
<Image
  src={image.url}
  width={200}
  height={200}
  className="object-cover"
  sizes="200px" // Forzar tamaño pequeño
/>
```

2. **Next.js automáticamente generará versiones optimizadas** según el `sizes` attribute

**Beneficio:** Aprovecha optimización de Next.js sin código adicional

---

## 📊 Comparación de Opciones

| Opción | Esfuerzo | Impacto | Recomendación |
|--------|----------|---------|---------------|
| **Lazy Loading + Paginación** | 1 día | 70-80% | ✅ **HACER PRIMERO** |
| **Thumbnails con Sharp** | 2-3 días | 90% | ✅ **HACER DESPUÉS** |
| **Next.js Image sizes** | 30 min | 50-60% | ✅ **HACER SI NO HAY TIEMPO** |

---

## ✅ Recomendación Final

**Implementar en este orden:**

1. **HOY:** Lazy Loading + Paginación (1 día, impacto inmediato)
2. **ESTA SEMANA:** Thumbnails con Sharp (2-3 días, optimización a largo plazo)
3. **OPCIONAL:** Service Worker para cache (mejora adicional)

**ROI:** 
- Día 1: 70-80% mejora inmediata
- Día 2-3: 90% reducción de ancho de banda
- **Total: 5-7 días → Experiencia 10x mejor**

