'use client'

import { PreviewTestStep } from '@/components/whatsapp/wizard/PreviewTestStep'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TestWhatsAppPage() {
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/config')
      const result = await response.json()

      if (result.success && result.data) {
        setConfig(result.data)
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-bg-primary p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-text-secondary">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-4xl mx-auto">
        <StandardBreadcrumbs
          currentPage="Probar Asistente"
          parentPages={[
            { label: 'WhatsApp', href: '/dashboard/whatsapp' }
          ]}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Probar Asistente de WhatsApp
          </h1>
          <p className="text-text-secondary mb-8">
            Envía mensajes de prueba para verificar cómo responde tu bot
          </p>

          <PreviewTestStep
            data={config}
            onSave={() => router.push('/dashboard/whatsapp')}
            loading={false}
          />
        </div>
      </div>
    </div>
  )
}

