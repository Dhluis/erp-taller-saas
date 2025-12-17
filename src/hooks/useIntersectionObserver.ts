import { useEffect, useRef, useState } from 'react'

/**
 * Hook para detectar cuando un elemento entra en el viewport
 * Útil para lazy loading de imágenes y otros elementos
 */
export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const [hasIntersected, setHasIntersected] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        setIsIntersecting(isVisible)
        
        // Solo marcar como "intersected" una vez para evitar re-renders innecesarios
        if (isVisible && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      {
        threshold: 0.1, // Disparar cuando 10% del elemento es visible
        rootMargin: '50px', // Cargar 50px antes de que sea visible (preload)
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [hasIntersected, options])

  return { ref, isIntersecting, hasIntersected }
}

