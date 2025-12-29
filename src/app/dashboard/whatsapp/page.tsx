'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/context/SessionContext'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ModernIcons from '@/components/icons/ModernIcons'
import { ArrowRight, Loader2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function WhatsAppPage() {
  const { organizationId, isLoading: sessionLoading } = useSession()
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false) // Ref para evitar recargas múltiples
  const configLoadedRef = useRef<string | null>(null) // Ref para trackear qué config se cargó
  const [webhookStatus, setWebhookStatus] = useState<{
    isConfigured: boolean;
    isCorrect: boolean;
    webhook?: any;
    expectedOrgId?: string;
    actualOrgId?: string;
  } | null>(null)
  const [verifyingWebhook, setVerifyingWebhook] = useState(false)

  console.log('[WhatsApp Page] 🔍 useSession hook:', {
    organizationId,
    isLoading: sessionLoading,
    hasOrgId: !!organizationId
  })
  
  const loadConfig = useCallback(async () => {
    if (!organizationId) {
      console.log('[WhatsApp Page] ⏳ Esperando organization ID...')
      setLoading(false)
      return
    }

    try {
      console.log('[WhatsApp Page] 📡 Iniciando carga de configuración...')
      console.log('[WhatsApp Page] 📍 Organization ID:', organizationId)
      setLoading(true)
      
      const response = await fetch('/api/whatsapp/config', {
        cache: 'no-store', // Evitar cache para obtener datos frescos
        credentials: 'include'
      })
      
      console.log('[WhatsApp Page] 📦 Respuesta HTTP:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        console.error('[WhatsApp Page] ❌ Error HTTP:', response.status, response.statusText)
        setConfig(null)
        configLoadedRef.current = null // Reset ref en caso de error HTTP
        setLoading(false)
        return
      }
      
      const result = await response.json()
      console.log('[WhatsApp Page] 📥 Respuesta del API:', {
        success: result.success,
        has_data: !!result.data,
        data_keys: result.data ? Object.keys(result.data) : [],
        error: result.error
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
        
        console.log('[WhatsApp Page] ✅ Data completa:', {
          id: configData.id,
          enabled: configData.enabled,
          has_policies: !!configData.policies,
          has_waha_config: hasWahaConfig,
          has_waha_url: !!(policies.waha_api_url || policies.WAHA_API_URL),
          has_waha_key: !!(policies.waha_api_key || policies.WAHA_API_KEY),
          has_services: !!(configData.services && configData.services.length > 0),
          has_session_name: !!configData.whatsapp_session_name,
          provider: configData.provider,
          model: configData.model,
          waha_config_type: policies.waha_config_type
        })
        
        // Si tiene configuración (policies, servicios, etc.), considerarlo como configurado
        const isConfigured = configData.enabled || 
                            hasWahaConfig || 
                            (configData.services && configData.services.length > 0) ||
                            configData.provider ||
                            configData.model ||
                            configData.whatsapp_session_name
        
        console.log('[WhatsApp Page] 🔍 Análisis de configuración:', {
          enabled_original: configData.enabled,
          isConfigured,
          hasWahaConfig,
          hasProvider: !!configData.provider,
          hasModel: !!configData.model,
          hasServices: !!(configData.services && configData.services.length > 0),
          hasSessionName: !!configData.whatsapp_session_name,
          will_set_enabled: isConfigured && !configData.enabled
        })
        
        // Si tiene configuración pero enabled es false, actualizar en BD y en estado local
        if (isConfigured && !configData.enabled) {
          console.log('[WhatsApp Page] 🔧 Configuración detectada, actualizando enabled=true en BD...')
          try {
            // Actualizar enabled en la BD para que persista
            const updateResponse = await fetch('/api/whatsapp/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              cache: 'no-store',
              body: JSON.stringify({
                enabled: true
              })
            })
            
            if (updateResponse.ok) {
              console.log('[WhatsApp Page] ✅ enabled actualizado en BD')
              configData.enabled = true
            } else {
              console.warn('[WhatsApp Page] ⚠️ No se pudo actualizar enabled en BD, usando valor local')
              configData.enabled = true // Actualizar localmente de todas formas
            }
          } catch (updateError) {
            console.error('[WhatsApp Page] ❌ Error actualizando enabled:', updateError)
            // Continuar de todas formas con el valor local
            configData.enabled = true
          }
        }
        
        // Solo actualizar si los datos realmente cambiaron
        const configId = configData.id
        if (configId !== configLoadedRef.current) {
          setConfig(configData)
          configLoadedRef.current = configId
          console.log('[WhatsApp Page] ✅ Configuración establecida en estado, enabled:', configData.enabled)
        } else {
          console.log('[WhatsApp Page] ⏭️ Configuración sin cambios, omitiendo actualización')
        }
      } else {
        setConfig(null)
        configLoadedRef.current = null // Reset ref cuando no hay config
        console.log('[WhatsApp Page] ⚠️ No hay configuración disponible (result.data es null o undefined)')
        console.log('[WhatsApp Page] ⚠️ Detalles:', {
          success: result.success,
          has_data: !!result.data,
          error: result.error
        })
      }
    } catch (error) {
      console.error('[WhatsApp Page] ❌ Error cargando configuración:', error)
      setConfig(null)
      configLoadedRef.current = null // Reset ref en caso de error
    } finally {
      setLoading(false)
      console.log('[WhatsApp Page] ✅ Carga completada, loading=false')
    }
  }, [organizationId])

  // ✅ Cargar configuración SOLO cuando organizationId cambia (NO incluir loadConfig en dependencias)
  useEffect(() => {
    console.log('[WhatsApp Page] 🔄 useEffect triggered:', {
      organizationId,
      isLoading: sessionLoading,
      hasLoaded: hasLoadedRef.current,
      shouldLoad: !sessionLoading && !!organizationId && !hasLoadedRef.current
    })
    
    // Solo cargar si NO está cargando Y hay organizationId Y no se ha cargado antes
    if (!sessionLoading && organizationId && !hasLoadedRef.current) {
      console.log('[WhatsApp Page] ✅ Llamando a loadConfig() - primera carga')
      hasLoadedRef.current = true
      loadConfig()
    } else if (sessionLoading) {
      console.log('[WhatsApp Page] ⏳ Sesión cargando...')
      hasLoadedRef.current = false // Reset mientras carga
    } else if (!organizationId) {
      console.log('[WhatsApp Page] ⚠️ Sin organizationId después de cargar')
      hasLoadedRef.current = false // Reset si se pierde organizationId
      configLoadedRef.current = null
    }
    // NO incluir loadConfig en dependencias para evitar loops
  }, [organizationId, sessionLoading]) // ✅ Solo organizationId y sessionLoading

  // 🔍 Log de debugging del estado actual
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[WhatsApp Page] 🔍 ESTADO ACTUAL DE LA PÁGINA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('sessionLoading:', sessionLoading)
    console.log('hasConfig:', !!config)
    console.log('isActive (config?.enabled):', config?.enabled)
    console.log('organizationId:', organizationId)
    console.log('loading (config):', loading)
    console.log('config existe:', !!config)
    if (config) {
      console.log('config.id:', config.id)
      console.log('config.enabled:', config.enabled)
      console.log('config.has_policies:', !!config.policies)
      if (config.policies) {
        const policies = config.policies as any
        console.log('config.policies.waha_api_url existe:', !!(policies.waha_api_url || policies.WAHA_API_URL))
        console.log('config.policies.waha_api_key existe:', !!(policies.waha_api_key || policies.WAHA_API_KEY))
        console.log('config.policies.waha_config_type:', policies.waha_config_type)
      }
      console.log('config.has_services:', !!(config.services && config.services.length > 0))
      console.log('config.provider:', config.provider)
      console.log('config.model:', config.model)
      console.log('config.whatsapp_session_name:', config.whatsapp_session_name)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [config, organizationId, loading, sessionLoading])

  // ✅ Recargar cuando se regresa de otra página (focus + visibilitychange)
  // Usar useRef para evitar re-registrar listeners constantemente
  const loadConfigRef = useRef(loadConfig)
  useEffect(() => {
    loadConfigRef.current = loadConfig
  }, [loadConfig])

  useEffect(() => {
    if (!organizationId) return

    const handleFocus = () => {
      console.log('[WhatsApp] 🔄 Ventana enfocada, recargando configuración...')
      setTimeout(() => {
        loadConfigRef.current()
      }, 500)
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[WhatsApp] 🔄 Página visible, recargando configuración...')
        setTimeout(() => {
          loadConfigRef.current()
        }, 500)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [organizationId]) // ✅ Solo organizationId, NO loadConfig

  // ❌ POLLING DESHABILITADO - Causaba loop infinito de recargas
  // El polling se puede reactivar manualmente cuando el usuario necesite verificar conexión
  // useEffect(() => {
  //   if (sessionLoading || !organizationId) return
  //   const pollingInterval = setInterval(() => {
  //     const needsUpdate = !config?.whatsapp_phone || !config?.whatsapp_connected
  //     if (needsUpdate) {
  //       loadConfig()
  //     }
  //   }, 5000)
  //   return () => clearInterval(pollingInterval)
  // }, [organizationId, sessionLoading, config?.whatsapp_phone, config?.whatsapp_connected, loadConfig])

  // Escuchar eventos personalizados de conexión de WhatsApp
  useEffect(() => {
    const handleWhatsAppConnected = () => {
      console.log('[WhatsApp] 🔔 Evento de conexión recibido, recargando configuración...')
      // Esperar un poco para que el backend actualice
      setTimeout(() => {
        loadConfigRef.current()
      }, 2000)
    }

    window.addEventListener('whatsapp:connected', handleWhatsAppConnected)
    return () => window.removeEventListener('whatsapp:connected', handleWhatsAppConnected)
  }, []) // ✅ Sin dependencias - se registra una sola vez

  // ✅ Escuchar evento cuando se guarda la configuración del AI Agent
  useEffect(() => {
    const handleConfigSaved = () => {
      console.log('[WhatsApp] 🔔 Evento de configuración guardada recibido, recargando...')
      // Resetear los refs para permitir recarga
      hasLoadedRef.current = false
      configLoadedRef.current = null
      // Esperar un poco para que el backend actualice
      setTimeout(() => {
        loadConfigRef.current()
        hasLoadedRef.current = true
      }, 1000)
    }

    window.addEventListener('ai-agent:config-saved', handleConfigSaved)
    return () => window.removeEventListener('ai-agent:config-saved', handleConfigSaved)
  }, []) // ✅ Sin dependencias - se registra una sola vez

  const handleTrainAgent = () => {
    router.push('/dashboard/whatsapp/train-agent')
  }

  const handleTestAgent = () => {
    router.push('/dashboard/whatsapp/test')
  }

  // Verificar webhook (solo desarrollo/admin)
  const handleVerifyWebhook = useCallback(async () => {
    if (!organizationId) return

    setVerifyingWebhook(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ action: 'verify_webhook' })
      })

      const data = await response.json()

      if (data.success) {
        setWebhookStatus({
          isConfigured: data.isConfigured,
          isCorrect: data.isCorrect,
          webhook: data.webhook,
          expectedOrgId: data.expectedOrgId,
          actualOrgId: data.actualOrgId
        })
      } else {
        console.error('Error verificando webhook:', data.error)
      }
    } catch (error: any) {
      console.error('Error verificando webhook:', error)
    } finally {
      setVerifyingWebhook(false)
    }
  }, [organizationId])

  // Actualizar webhook (solo si está incorrecto)
  const handleUpdateWebhook = useCallback(async () => {
    if (!organizationId) return

    setVerifyingWebhook(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ action: 'force_update_webhook' })
      })

      const data = await response.json()

      if (data.success) {
        // Re-verificar después de actualizar
        await handleVerifyWebhook()
      } else {
        console.error('Error actualizando webhook:', data.error)
      }
    } catch (error: any) {
      console.error('Error actualizando webhook:', error)
    } finally {
      setVerifyingWebhook(false)
    }
  }, [organizationId, handleVerifyWebhook])

  // Mostrar loader mientras se carga la sesión
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-text-secondary">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si no hay organizationId después de cargar
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-text-primary font-semibold mb-2">Error: No se pudo obtener la organización</p>
          <p className="text-text-secondary text-sm">Por favor, recarga la página o contacta al administrador.</p>
        </div>
      </div>
    )
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
                {(() => {
                  // Determinar si está activo basándose en si tiene configuración real
                  // Verificar si tiene configuración WAHA en policies
                  const policies = config?.policies || {}
                  const hasWahaConfig = !!(policies.waha_api_url || policies.WAHA_API_URL)
                  
                  // Si tiene provider, model, services, WAHA config, o enabled, considerarlo activo
                  const hasConfig = !!(
                    config?.provider || 
                    config?.model || 
                    (config?.services && config.services && config.services.length > 0) ||
                    hasWahaConfig ||
                    config?.whatsapp_session_name ||
                    config?.enabled
                  )
                  
                  // Está activo si tiene enabled=true O si tiene cualquier configuración
                  const isEnabled = config?.enabled || hasConfig
                  
                  console.log('[WhatsApp Page] 🎨 Renderizando badge:', {
                    'config?.enabled': config?.enabled,
                    'hasWahaConfig': hasWahaConfig,
                    'hasProvider': !!config?.provider,
                    'hasModel': !!config?.model,
                    'hasServices': !!(config?.services && config.services.length > 0),
                    'hasSessionName': !!config?.whatsapp_session_name,
                    'hasConfig': hasConfig,
                    'isEnabled': isEnabled,
                    'config existe': !!config
                  })
                  
                  return (
                    <Badge variant={isEnabled ? "success" : "secondary"}>
                      {isEnabled ? (
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
                  )
                })()}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-text-secondary mt-2">Cargando configuración...</p>
                </div>
              ) : (() => {
                // Verificar si realmente tiene configuración (misma lógica que el badge)
                const policies = config?.policies || {}
                const hasWahaConfig = !!(policies.waha_api_url || policies.WAHA_API_URL)
                const hasConfig = !!(
                  config?.provider || 
                  config?.model || 
                  (config?.services && config.services.length > 0) ||
                  hasWahaConfig ||
                  config?.whatsapp_session_name
                )
                
                // Si tiene configuración, mostrar detalles
                if (hasConfig) {
                  return (
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
                      {hasWahaConfig && (
                        <div>
                          <p className="text-sm text-text-secondary mb-1">WAHA Config</p>
                          <p className="font-medium text-green-600">✓ Configurado</p>
                        </div>
                      )}
                      {config?.whatsapp_session_name && (
                        <div>
                          <p className="text-sm text-text-secondary mb-1">Sesión WhatsApp</p>
                          <p className="font-medium">{config.whatsapp_session_name}</p>
                        </div>
                      )}
                    </div>
                  )
                }
                
                // Si no tiene configuración, mostrar mensaje de entrenar
                return (
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
                )
              })()}
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

          {/* Sección: Diagnóstico de Configuración Multi-Tenant (solo desarrollo/admin) */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG === 'true') && (
            <Card className="mt-6 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🔧 Configuración Multi-Tenant
                </CardTitle>
                <CardDescription>
                  Diagnóstico y gestión de webhooks con Organization ID dinámico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Indicador de estado */}
                  {webhookStatus && (
                    <div className="flex items-center gap-2">
                      {webhookStatus.isCorrect ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle size={14} />
                          Webhook configurado correctamente
                        </Badge>
                      ) : webhookStatus.isConfigured ? (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <AlertCircle size={14} />
                          Webhook con Organization ID incorrecto
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle size={14} />
                          Sin webhook configurado
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Información del webhook */}
                  {webhookStatus?.webhook && (
                    <div className="bg-white p-4 rounded-md border space-y-2 text-sm">
                      <p className="font-semibold mb-2">📋 Configuración del Webhook:</p>
                      <div className="space-y-1 text-gray-600">
                        <p><strong>URL:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{webhookStatus.webhook.url}</code></p>
                        <p><strong>Eventos:</strong> {webhookStatus.webhook.events?.join(', ') || 'N/A'}</p>
                        {webhookStatus.webhook.customHeaders && webhookStatus.webhook.customHeaders.length > 0 && (
                          <div>
                            <strong>Custom Headers:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {webhookStatus.webhook.customHeaders.map((header: any, idx: number) => (
                                <li key={idx}>
                                  <code className="bg-gray-100 px-1 rounded text-xs">{header.name}</code>: <code className="bg-gray-100 px-1 rounded text-xs">{header.value}</code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {webhookStatus.expectedOrgId && (
                        <div className="mt-3 pt-3 border-t">
                          <p><strong>Organization ID esperado:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{webhookStatus.expectedOrgId}</code></p>
                          {webhookStatus.actualOrgId && (
                            <p><strong>Organization ID actual:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{webhookStatus.actualOrgId}</code></p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyWebhook}
                      variant="outline"
                      size="sm"
                      disabled={verifyingWebhook || !organizationId}
                    >
                      <RefreshCw size={14} className={`mr-2 ${verifyingWebhook ? 'animate-spin' : ''}`} />
                      Verificar Webhook
                    </Button>
                    {webhookStatus && !webhookStatus.isCorrect && (
                      <Button
                        onClick={handleUpdateWebhook}
                        variant="outline"
                        size="sm"
                        disabled={verifyingWebhook || !organizationId}
                      >
                        <CheckCircle size={14} className="mr-2" />
                        Actualizar Webhook
                      </Button>
                    )}
                  </div>

                  {/* Alert informativo */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Información</AlertTitle>
                    <AlertDescription className="text-sm">
                      Esta herramienta verifica que el webhook esté configurado correctamente con el Organization ID dinámico. 
                      Cada organización debe tener su propio webhook configurado con su Organization ID específico.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}




