'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Componente que ajusta el tema del HTML/body cuando estamos en la landing page
 * Esto asegura que la landing page siempre tenga tema claro, incluso si el layout
 * tiene tema oscuro por defecto
 */
export function LandingPageThemeFix() {
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const html = document.documentElement
    const body = document.body

    if (isLandingPage) {
      // Landing page: Remover tema oscuro completamente
      html.classList.remove('dark')
      html.style.colorScheme = 'light'
      html.setAttribute('data-theme', 'light')
      
      // Asegurar fondo blanco en body y remover clases oscuras
      body.classList.remove('bg-bg-primary', 'text-text-primary')
      body.style.backgroundColor = 'white'
      body.style.color = '#111827'
      body.setAttribute('data-landing', 'true')
      
      // Asegurar que TODOS los wrappers tengan fondo blanco
      // El wrapper está en: body > div (Providers) > div (layout wrapper)
      // Usar requestAnimationFrame para asegurar que el DOM esté listo
      requestAnimationFrame(() => {
        const providersWrapper = body.querySelector('body > div:first-child')
        const layoutWrapper = providersWrapper?.querySelector('div:first-child')
        
        if (layoutWrapper) {
          const wrapper = layoutWrapper as HTMLElement
          wrapper.classList.remove('bg-bg-primary', 'text-text-primary')
          wrapper.style.backgroundColor = 'white'
          wrapper.style.color = '#111827'
          wrapper.style.minHeight = '100vh'
        }
        
        // También ajustar cualquier otro wrapper que pueda tener clases oscuras
        const allWrappers = body.querySelectorAll('div.bg-bg-primary, div.text-text-primary')
        allWrappers.forEach((wrapper) => {
          const el = wrapper as HTMLElement
          if (el.closest('[data-landing-page="true"]') || el.closest('.landing-page-wrapper')) {
            el.classList.remove('bg-bg-primary', 'text-text-primary')
            el.style.backgroundColor = 'white'
            el.style.color = '#111827'
          }
        })
      })
      
      // También ajustar el meta theme-color y color-scheme
      let themeColorMeta = document.querySelector('meta[name="theme-color"]')
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta')
        themeColorMeta.setAttribute('name', 'theme-color')
        document.head.appendChild(themeColorMeta)
      }
      themeColorMeta.setAttribute('content', '#FFFFFF')
      
      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
      if (colorSchemeMeta) {
        colorSchemeMeta.setAttribute('content', 'light')
      }
    } else {
      // Dashboard: Aplicar tema oscuro
      html.classList.add('dark')
      html.style.colorScheme = 'dark'
      html.setAttribute('data-theme', 'dark')
      body.removeAttribute('data-landing')
    }

    // Cleanup: Restaurar cuando salgas de la landing page
    return () => {
      if (!isLandingPage) {
        html.classList.add('dark')
        html.style.colorScheme = 'dark'
        html.setAttribute('data-theme', 'dark')
        body.removeAttribute('data-landing')
      }
    }
  }, [isLandingPage])

  return null
}
