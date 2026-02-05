'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/context/SessionContext'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ModernIcons from '@/components/icons/ModernIcons'
import { ArrowRight, Loader2, AlertCircle, RefreshCw, CheckCircle, Check, Star, Clock, Sparkles, Shield, Zap, CreditCard } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TestMessageModal } from '@/components/messaging/TestMessageModal'
import { StatusBadge } from '@/components/messaging/StatusBadge'
import { Progress } from '@/components/ui/progress'

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
  const [activeTab, setActiveTab] = useState<'asistente' | 'envio' | 'testing'>('asistente')
  const [messagingConfig, setMessagingConfig] = useState<any>(null)
  const [loadingMessagingConfig, setLoadingMessagingConfig] = useState(false)
  const [messagingConfigError, setMessagingConfigError] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [activatingTrial, setActivatingTrial] = useState(false)
  const messagingConfigLoadedRef = useRef(false) // Ref para evitar múltiples cargas

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

  // Cargar configuración de mensajería para tab de planes
  const loadMessagingConfig = useCallback(async () => {
    if (!organizationId || messagingConfigLoadedRef.current || loadingMessagingConfig) return
    
    setLoadingMessagingConfig(true)
    setMessagingConfigError(false)
    messagingConfigLoadedRef.current = true
    
    try {
      const response = await fetch('/api/messaging/config', {
        cache: 'no-store',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessagingConfig(data.config)
        setMessagingConfigError(false)
      } else {
        console.warn('[WhatsApp] No se pudo cargar configuración de mensajería:', response.status)
        setMessagingConfigError(true)
        // Reset ref para permitir reintento manual
        messagingConfigLoadedRef.current = false
      }
    } catch (error) {
      console.error('Error loading messaging config:', error)
      setMessagingConfigError(true)
      // Reset ref para permitir reintento manual
      messagingConfigLoadedRef.current = false
    } finally {
      setLoadingMessagingConfig(false)
    }
  }, [organizationId, loadingMessagingConfig])

  // Cargar configuración de mensajería cuando cambia el tab a "envio" o "testing"
  useEffect(() => {
    if ((activeTab === 'envio' || activeTab === 'testing') && !messagingConfig && !loadingMessagingConfig && !messagingConfigLoadedRef.current) {
      loadMessagingConfig()
    }
  }, [activeTab]) // Solo activeTab en dependencias para evitar loops

  // Handler para enviar prueba de WhatsApp
  const handleTestWhatsApp = async (data: { testValue: string }) => {
    const response = await fetch('/api/messaging/test/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testPhone: data.testValue }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al enviar WhatsApp de prueba')
    }

    const result = await response.json()
    return result
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

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'asistente' | 'envio' | 'testing')} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="asistente">🤖 Asistente IA</TabsTrigger>
              <TabsTrigger value="envio">📤 Planes y Envío</TabsTrigger>
              <TabsTrigger value="testing">🧪 Probar</TabsTrigger>
            </TabsList>

            {/* Tab: Asistente IA (Contenido Original) */}
            <TabsContent value="asistente" className="mt-6">
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
            </TabsContent>

            {/* Tab: Planes y Envío */}
            <TabsContent value="envio" className="mt-6">
              {loadingMessagingConfig ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-text-secondary">Cargando configuración...</p>
                </div>
              ) : messagingConfigError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-warning mx-auto mb-4" />
                  <p className="text-text-primary font-semibold mb-2">No se pudo cargar la configuración</p>
                  <p className="text-text-secondary text-sm mb-4">
                    El endpoint de mensajería no está disponible. Esto es normal si aún no has configurado el sistema de mensajería.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      messagingConfigLoadedRef.current = false
                      loadMessagingConfig()
                    }}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (() => {
                const status = messagingConfig?.subscription_status || 'none'
                const isTrial = status === 'trial'
                const isActive = status === 'active'
                const isExpired = status === 'expired'
                const isNone = status === 'none'

                // Calcular días restantes de prueba
                let daysLeft = 0
                let trialProgress = 0
                
                if (isTrial && messagingConfig?.trial_ends_at) {
                  const now = new Date()
                  const endDate = new Date(messagingConfig.trial_ends_at)
                  const diffTime = endDate.getTime() - now.getTime()
                  daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
                  trialProgress = ((7 - daysLeft) / 7) * 100
                }

                const handleStartTrial = async () => {
                  setActivatingTrial(true)
                  try {
                    const response = await fetch('/api/messaging/start-trial', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    })
                    
                    const data = await response.json()
                    
                    if (data.success) {
                      // Recargar configuración
                      messagingConfigLoadedRef.current = false
                      loadMessagingConfig()
                    } else {
                      alert(data.error || 'Error iniciando prueba')
                    }
                  } catch (error) {
                    console.error('Error iniciando trial:', error)
                    alert('Error iniciando prueba gratis')
                  } finally {
                    setActivatingTrial(false)
                  }
                }

                const handleActivateSubscription = () => {
                  // Redirigir a página de pago/checkout
                  router.push('/checkout/whatsapp-premium')
                }

                return (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-text-primary mb-2">💬 WhatsApp Business</h2>
                          <p className="text-text-secondary">Asistente virtual con IA para tu taller</p>
                        </div>
                        {isTrial && (
                          <Badge variant="secondary" className="text-sm py-1 px-3">
                            🎁 Prueba Gratis - {daysLeft} días restantes
                          </Badge>
                        )}
                        {isActive && (
                          <Badge className="text-sm py-1 px-3 bg-green-500">
                            ✓ Suscripción Activa
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive" className="text-sm py-1 px-3">
                            ⚠️ Prueba Finalizada
                          </Badge>
                        )}
                        {isNone && (
                          <Badge variant="outline" className="text-sm py-1 px-3">
                            Sin configurar
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Trial Alert */}
                    {isTrial && (
                      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-900 dark:text-blue-100">
                              Tu prueba gratis finaliza en {daysLeft} días
                            </span>
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                              {daysLeft}/7 días
                            </span>
                          </div>
                          <Progress value={trialProgress} className="h-2 mb-2" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Activa tu suscripción antes de que termine para no perder acceso
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Expired Alert */}
                    {isExpired && (
                      <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Tu prueba gratis ha finalizado. Activa tu suscripción para continuar usando WhatsApp Business.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Main Package Card */}
                    <Card className="relative overflow-hidden border-2 border-primary/20 shadow-lg mb-6">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl -z-10"></div>
                      
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                              <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl">WhatsApp Business Premium</CardTitle>
                              <CardDescription className="text-base">
                                API Oficial + IA Avanzada
                              </CardDescription>
                            </div>
                          </div>
                          
                          {isActive && (
                            <Badge className="bg-green-500">
                              ✓ Activo
                            </Badge>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">$2,900</span>
                            <span className="text-lg text-text-secondary">MXN/mes</span>
                          </div>
                          <p className="text-sm text-text-secondary mt-1">
                            {isTrial && 'Después de tu prueba gratis de 7 días'}
                            {isExpired && 'Activa ahora para continuar'}
                            {isActive && 'Tu suscripción está activa'}
                            {isNone && 'Incluye 7 días de prueba gratis'}
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        {/* Features Grid */}
                        <div className="grid gap-4">
                          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide">
                            Incluye:
                          </h3>
                          
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">WhatsApp Business API Oficial</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Badge verificado ✓</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">IA avanzada (GPT-4o-mini)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Mensajes ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Número profesional dedicado</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Sin riesgo de bloqueo</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Plantillas pre-aprobadas</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">Soporte prioritario 24/7</span>
                            </div>
                          </div>
                        </div>

                        {/* Trial Info */}
                        {(isNone || isTrial) && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">
                                  {isNone ? '7 días de prueba gratis' : 'En período de prueba'}
                                </h4>
                                <p className="text-sm text-text-secondary">
                                  {isNone && 'Prueba todas las funciones sin costo. Usa WAHA durante la prueba, luego migra a API Oficial.'}
                                  {isTrial && 'Estás usando WAHA. Activa tu suscripción para migrar a WhatsApp Business API Oficial.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Active Subscription Info */}
                        {isActive && messagingConfig?.whatsapp_api_number && (
                          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            <div className="flex items-start gap-3">
                              <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                                  Número WhatsApp Business
                                </h4>
                                <p className="text-sm text-green-700 dark:text-green-300 font-mono">
                                  {messagingConfig.whatsapp_api_number}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  API Oficial activa y verificada ✓
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CTA Button */}
                        <div className="pt-4">
                          {isNone && (
                            <Button 
                              className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                              onClick={handleStartTrial}
                              disabled={activatingTrial}
                            >
                              {activatingTrial ? (
                                <>
                                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-5 h-5 mr-2" />
                                  Iniciar Prueba Gratis (7 días)
                                </>
                              )}
                            </Button>
                          )}
                          {isExpired && (
                            <Button 
                              className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                              onClick={handleActivateSubscription}
                            >
                              <CreditCard className="w-5 h-5 mr-2" />
                              Activar Suscripción
                            </Button>
                          )}

                          {isTrial && (
                            <Button 
                              className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                              onClick={handleActivateSubscription}
                            >
                              <CreditCard className="w-5 h-5 mr-2" />
                              Activar Suscripción Ahora
                            </Button>
                          )}

                          {isActive && (
                            <Button 
                              variant="outline"
                              className="w-full h-12 text-base"
                              onClick={() => router.push('/configuracion/facturacion')}
                            >
                              <CreditCard className="w-5 h-5 mr-2" />
                              Gestionar Suscripción
                            </Button>
                          )}
                        </div>

                        {/* Footer Note */}
                        <p className="text-xs text-center text-text-secondary pt-2">
                          {(isNone || isExpired) && 'Sin permanencia. Cancela cuando quieras.'}
                          {isTrial && 'Puedes cancelar durante la prueba sin cargo alguno.'}
                          {isActive && 'Facturación mensual automática.'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Benefits Section */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <Card className="text-center">
                        <CardContent className="pt-6">
                          <div className="flex justify-center mb-3">
                            <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
                              <Shield className="w-8 h-8 text-blue-500" />
                            </div>
                          </div>
                          <h3 className="font-semibold mb-2">100% Seguro</h3>
                          <p className="text-sm text-text-secondary">API oficial de Meta. Sin riesgo de bloqueo de cuenta.</p>
                        </CardContent>
                      </Card>
                      <Card className="text-center">
                        <CardContent className="pt-6">
                          <div className="flex justify-center mb-3">
                            <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
                              <Sparkles className="w-8 h-8 text-purple-500" />
                            </div>
                          </div>
                          <h3 className="font-semibold mb-2">IA Avanzada</h3>
                          <p className="text-sm text-text-secondary">Respuestas inteligentes con contexto completo del cliente.</p>
                        </CardContent>
                      </Card>
                      <Card className="text-center">
                        <CardContent className="pt-6">
                          <div className="flex justify-center mb-3">
                            <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg">
                              <Zap className="w-8 h-8 text-yellow-500" />
                            </div>
                          </div>
                          <h3 className="font-semibold mb-2">Sin Límites</h3>
                          <p className="text-sm text-text-secondary">Envía todos los mensajes que necesites, sin restricciones.</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Help Section */}
                    <div className="mt-8 text-center">
                      <p className="text-sm text-text-secondary">
                        ¿Tienes dudas? {' '}
                        <a href="/soporte" className="text-primary hover:underline font-medium">
                          Contacta a soporte
                        </a>
                      </p>
                    </div>
                  </>
                )
              })()}
            </TabsContent>

            {/* Tab: Testing */}
            <TabsContent value="testing" className="mt-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-2">🧪 Probar WhatsApp</h2>
                <p className="text-text-secondary">Envía mensajes de prueba para verificar tu configuración</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Enviar Mensaje de Prueba</CardTitle>
                  <CardDescription>
                    Prueba que tu configuración de WhatsApp funciona correctamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary mb-4">
                    Ingresa un número de teléfono para enviar un mensaje de prueba. El número debe incluir el código de país (ej: +52 81 1234 5678).
                  </p>
                  <Button onClick={() => setShowTestModal(true)}>
                    Enviar Prueba
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Test Modal */}
          <TestMessageModal
            isOpen={showTestModal}
            onClose={() => setShowTestModal(false)}
            channel="whatsapp"
            onSend={handleTestWhatsApp}
          />
        </div>
      </div>
    </div>
  )
}




