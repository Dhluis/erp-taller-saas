/**
 * Hook para detectar si el dispositivo es móvil
 * Útil para optimizaciones específicas de móvil
 */
'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detectar en el cliente
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isMobileWidth = window.innerWidth < 768 // breakpoint md de Tailwind
      
      setIsMobile(isMobileUserAgent || isMobileWidth)
    }

    // Verificar inmediatamente
    checkIsMobile()

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkIsMobile)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  return isMobile
}

