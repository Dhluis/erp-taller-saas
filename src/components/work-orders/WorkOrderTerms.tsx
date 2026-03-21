'use client'

/**
 * WorkOrderTerms — Muestra el PDF de Términos y Condiciones del taller
 * en el detalle de la orden de trabajo. El PDF se carga desde company_settings,
 * por lo que el taller solo sube el archivo UNA VEZ y aparece en todas las órdenes.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, ExternalLink, Download, Upload, AlertCircle } from 'lucide-react'
import { getCompanySettings } from '@/lib/supabase/company-settings'

interface WorkOrderTermsProps {
  organizationId: string
}

export function WorkOrderTerms({ organizationId }: WorkOrderTermsProps) {
  const [termsPdfUrl, setTermsPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return

    const load = async () => {
      try {
        const settings = await getCompanySettings(organizationId)
        setTermsPdfUrl((settings as any)?.terms_pdf_url ?? null)
      } catch (e) {
        console.error('[WorkOrderTerms] Error loading settings:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId])

  const handleView = () => {
    if (!termsPdfUrl) return
    // Abrir en nueva pestaña evita el bug "Sin título" del iframe
    window.open(termsPdfUrl, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = () => {
    if (!termsPdfUrl) return
    const a = document.createElement('a')
    a.href = termsPdfUrl
    a.download = 'terminos-y-condiciones.pdf'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span className="text-sm">Cargando términos y condiciones...</span>
        </div>
      </Card>
    )
  }

  if (!termsPdfUrl) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Sin términos y condiciones configurados</p>
            <p className="text-xs mt-1">
              Ve a{' '}
              <a
                href="/configuraciones/empresa"
                className="underline text-primary hover:text-primary/80"
              >
                Configuraciones → Empresa
              </a>{' '}
              para subir el PDF de términos y condiciones del taller. Una vez subido, aparecerá automáticamente en todas las órdenes.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <FileText className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Términos y Condiciones</h3>
          <p className="text-xs text-muted-foreground">Documento oficial del taller</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleView}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Al continuar con el servicio, el cliente acepta los términos y condiciones del taller.
      </p>
    </Card>
  )
}
