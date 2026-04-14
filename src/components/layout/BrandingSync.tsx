'use client'

import { useEffect } from 'react'
import { useSession } from '@/lib/context/SessionContext'

/**
 * Componente que sincroniza la identidad visual de la pestaña del navegador
 * con la configuración de la empresa del usuario.
 */
export function BrandingSync() {
  const { companySettings, isLoading } = useSession()

  useEffect(() => {
    if (isLoading || !companySettings) return

    const logo = companySettings.logo_url
    const companyName = companySettings.company_name || 'Confia Drive ERP'

    // 1. Actualizar el Favicon dinámicamente
    if (logo) {
      const updateFavicon = (url: string) => {
        // Buscar o crear los links de icono
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.getElementsByTagName('head')[0].appendChild(link)
        }
        link.href = url

        // También actualizar el apple-touch-icon
        let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement
        if (!appleLink) {
          appleLink = document.createElement('link')
          appleLink.rel = 'apple-touch-icon'
          document.getElementsByTagName('head')[0].appendChild(appleLink)
        }
        appleLink.href = url
      }

      updateFavicon(logo)
    }

    // 2. Actualizar el Título si es necesario (opcional)
    // document.title = `${companyName} - ERP System`

  }, [companySettings, isLoading])

  return null // Este componente no renderiza nada visual
}

