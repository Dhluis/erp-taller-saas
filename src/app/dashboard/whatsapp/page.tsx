'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ModernIcons from '@/components/icons/ModernIcons'
import { ArrowRight } from 'lucide-react'

export default function WhatsAppPage() {
  const { organization } = useAuth()
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ✅ DEFINIR loadConfig PRIMERO, antes de los useEffects
  // 🔧 FIX: Usar organization.id en lugar de organization.organization_id
  const organizationId = organization?.id || organization?.organization_id
  
  const loadConfig = useCallback(async () => {
    if (!organizationId) {
      console.log('[WhatsApp] ⏳ Esperando organization ID...')
      setLoading(false)
      return
    }

    try {
      console.log('[WhatsApp] 🔄 Cargando configuración para org:', organizationId)
      setLoading(true)
      
      const response = await fetch('/api/whatsapp/config', {
        cache: 'no-store', // Evitar cache para obtener datos frescos
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('[WhatsApp] ❌ Error HTTP:', response.status, response.statusText)
        setConfig(null)
        setLoading(false)
        return
      }
      
      const result = await response.json()
      console.log('[WhatsApp] 📥 Respuesta del API:', {
        success: result.success,
        has_data: !!result.data,
        data_keys: result.data ? Object.keys(result.data) : []
      })
      
      if (result.success && result.data) {
        const configData = result.data
        
        // Si whatsapp está en policies (fallback), extraerlo
        if (configData.policies?.whatsapp && !configData.whatsapp_phone) {
          configData.whatsapp_phone = configData.policies.whatsapp.phone
          configData.whatsapp_connected = configData.policies.whatsapp.connected
        }
        
        // Verificar si tiene credenciales WAHA en policies
        const policies = configData.policies || {}
        const hasWahaConfig = !!(policies.waha_api_url || policies.WAHA_API_URL)
        
        console.log('[WhatsApp] ✅ Configuración cargada:', {
          id: configData.id,
          enabled: configData.enabled,
          has_policies: !!configData.policies,
          has_waha_config: hasWahaConfig,
          has_services: !!(configData.services && configData.services.length > 0),
          provider: configData.provider,
          model: configData.model
        })
        
        // Si tiene configuración (policies, servicios, etc.), considerarlo como configurado
        const isConfigured = configData.enabled || 
                            hasWahaConfig || 
                            (configData.services && configData.services.length > 0) ||
                            configData.provider ||
                            configData.model
        
        if (isConfigured && !configData.enabled) {
          // Si tiene configuración pero enabled es false, establecerlo como true
          configData.enabled = true
          console.log('[WhatsApp] 🔧 Configuración detectada, estableciendo enabled=true')
        }
        
        setConfig(configData)
      } else {
        setConfig(null)
        console.log('[WhatsApp] ⚠️ No hay configuración disponible (result.data es null o undefined)')
      }
    } catch (error) {
      console.error('[WhatsApp] ❌ Error cargando configuración:', error)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // ✅ AHORA SÍ usar loadConfig en useEffect (después de definirlo)
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 🔍 Log de debugging del estado actual
  useEffect(() => {
    console.log('[WhatsApp Page] 🔍 Estado actual:', {
      hasConfig: !!config,
      isActive: config?.enabled,
      organizationId,
      configData: config ? {
        id: config.id,
        enabled: config.enabled,
        has_policies: !!config.policies,
        has_services: !!(config.services && config.services.length > 0),
        provider: config.provider,
        model: config.model
      } : 'null',
      loading
    })
  }, [config, organizationId, loading])

  // ✅ Recargar cuando se regresa de otra página (focus + visibilitychange)
  useEffect(() => {
    const handleFocus = () => {
      // Solo recargar si ya tenemos organization
      if (organizationId) {
        console.log('[WhatsApp] 🔄 Ventana enfocada, recargando configuración...')
        // Pequeño delay para asegurar que la BD se actualizó
        setTimeout(() => {
          loadConfig()
        }, 500)
      }
    }
    
    const handleVisibilityChange = () => {
      // Cuando la página se vuelve visible (usuario regresa de otra pestaña/página)
      if (document.visibilityState === 'visible' && organizationId) {
        console.log('[WhatsApp] 🔄 Página visible, recargando configuración...')
        setTimeout(() => {
          loadConfig()
        }, 500)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadConfig, organizationId])

  // Polling periódico para detectar cuando WhatsApp se conecta
  useEffect(() => {
    if (!organizationId) return

    // Verificar cada 5 segundos si WhatsApp se conectó
    const pollingInterval = setInterval(() => {
      // Solo hacer polling si no hay configuración de WhatsApp o si no está conectado
      const needsUpdate = !config?.whatsapp_phone || !config?.whatsapp_connected
      
      if (needsUpdate) {
        console.log('[WhatsApp] 🔄 Polling: Verificando estado de conexión...')
        loadConfig()
      }
    }, 5000) // Cada 5 segundos

    return () => clearInterval(pollingInterval)
  }, [organizationId, config?.whatsapp_phone, config?.whatsapp_connected, loadConfig])

  // Escuchar eventos personalizados de conexión de WhatsApp
  useEffect(() => {
    const handleWhatsAppConnected = () => {
      console.log('[WhatsApp] 🔔 Evento de conexión recibido, recargando configuración...')
      // Esperar un poco para que el backend actualice
      setTimeout(() => {
        loadConfig()
      }, 2000)
    }

    window.addEventListener('whatsapp:connected', handleWhatsAppConnected)
    return () => window.removeEventListener('whatsapp:connected', handleWhatsAppConnected)
  }, [loadConfig])

  // ✅ Escuchar evento cuando se guarda la configuración del AI Agent
  useEffect(() => {
    const handleConfigSaved = () => {
      console.log('[WhatsApp] 🔔 Evento de configuración guardada recibido, recargando...')
      // Esperar un poco para que el backend actualice
      setTimeout(() => {
        loadConfig()
      }, 1000)
    }

    window.addEventListener('ai-agent:config-saved', handleConfigSaved)
    return () => window.removeEventListener('ai-agent:config-saved', handleConfigSaved)
  }, [loadConfig])

  const handleTrainAgent = () => {
    router.push('/dashboard/whatsapp/train-agent')
  }

  const handleTestAgent = () => {
    router.push('/dashboard/whatsapp/test')
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        <StandardBreadcrumbs
          currentPage="WhatsApp"
          parentPages={[]}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            WhatsApp Business
          </h1>
          <p className="text-text-secondary mb-8">
            Configura y gestiona tu asistente virtual de WhatsApp
          </p>

          {/* Estado del Bot */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ModernIcons.Bot size={20} />
                    Estado del Asistente
                  </CardTitle>
                  <CardDescription>
                    Configuración actual de tu bot de WhatsApp
                  </CardDescription>
                </div>
                <Badge variant={config?.enabled ? "success" : "secondary"}>
                  {config?.enabled ? (
                    <>
                      <ModernIcons.Check size={14} />
                      Activo
                    </>
                  ) : (
                    <>
                      <ModernIcons.Error size={14} />
                      Inactivo
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-text-secondary mt-2">Cargando configuración...</p>
                </div>
              ) : config ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Provider</p>
                    <p className="font-medium">{config.provider || 'No configurado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Modelo</p>
                    <p className="font-medium">{config.model || 'No configurado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Servicios configurados</p>
                    <p className="font-medium">{(config.services || []).length} servicios</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ModernIcons.Bot size={48} className="mx-auto mb-4" />
                  <p className="text-text-secondary mb-4">
                    No hay configuración del asistente. Entrénalo para comenzar.
                  </p>
                  <Button onClick={handleTrainAgent}>
                    <ModernIcons.Entrenamiento size={16} className="mr-2" />
                    Entrenar Asistente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ModernIcons.Entrenamiento size={20} />
                  Entrenar Asistente
                </CardTitle>
                <CardDescription>
                  Configura la personalidad, servicios y políticas de tu bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Completa el wizard paso a paso para entrenar tu asistente de WhatsApp con la información de tu taller.
                </p>
                <Button onClick={handleTrainAgent} className="w-full">
                  Comenzar Entrenamiento
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ModernIcons.Testing size={20} />
                  Probar Asistente
                </CardTitle>
                <CardDescription>
                  Prueba cómo responde tu bot antes de activarlo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  {config 
                    ? 'Prueba el asistente con mensajes de ejemplo'
                    : 'Primero necesitas entrenar el asistente'}
                </p>
                <Button 
                  onClick={handleTestAgent} 
                  variant="outline"
                  className="w-full"
                  disabled={!config}
                >
                  Probar Ahora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ModernIcons.Configuracion size={20} />
                  Configuración
                </CardTitle>
                <CardDescription>
                  Ajusta la configuración avanzada del bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Configura providers, modelos y parámetros avanzados del asistente.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleTrainAgent}
                >
                  Editar Configuración
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ModernIcons.Conversaciones size={20} />
                  Conversaciones
                </CardTitle>
                <CardDescription>
                  Revisa y gestiona las conversaciones de WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Ve todas las conversaciones y mensajes recibidos por WhatsApp.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const url = window.location.origin + '/dashboard/whatsapp/conversaciones'
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }}
                >
                  Ver Conversaciones
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}




