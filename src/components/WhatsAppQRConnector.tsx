'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppQRConnectorProps {
  onStatusChange?: (status: 'loading' | 'connected' | 'pending' | 'error') => void
  className?: string
  darkMode?: boolean
}

interface SessionStatus {
  status: 'connected' | 'pending'
  phone?: string
  name?: string
  qr?: string
  sessionName?: string
  expiresIn?: number
}

const POLLING_INTERVAL = 3000 // 3 segundos
const MAX_POLLING_TIME = 5 * 60 * 1000 // 5 minutos

export function WhatsAppQRConnector({
  onStatusChange,
  className,
  darkMode = true
}: WhatsAppQRConnectorProps) {
  console.log('[WhatsAppQRConnector] 🚀 Componente montándose...')
  
  const [state, setState] = useState<'loading' | 'connected' | 'pending' | 'error'>('loading')
  const [sessionData, setSessionData] = useState<SessionStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isChangingNumber, setIsChangingNumber] = useState(false)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)

  // Función para verificar estado de sesión
  const checkSessionStatus = useCallback(async () => {
    try {
      console.log('[WhatsAppQRConnector] 🔍 Verificando estado de sesión...')
      const response = await fetch('/api/whatsapp/session')
      
      // Verificar si la respuesta es OK
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[WhatsAppQRConnector] ❌ Error HTTP:', response.status, errorText)
        throw new Error(`Error ${response.status}: ${errorText || 'Error al verificar estado'}`)
      }
      
      const data = await response.json()
      console.log('[WhatsAppQRConnector] 📦 Respuesta recibida:', { success: data.success, status: data.data?.status })

      if (!data.success) {
        const errorMsg = data.error || 'Error al verificar estado'
        const hint = data.hint ? `\n\n💡 ${data.hint}` : ''
        const debug = data.debug ? `\n\n🔍 Debug: ${JSON.stringify(data.debug, null, 2)}` : ''
        throw new Error(`${errorMsg}${hint}${debug}`)
      }

      const statusData = data.data

      if (statusData.status === 'connected') {
        setState('connected')
        setSessionData({
          status: 'connected',
          phone: statusData.phone,
          name: statusData.name
        })
        setErrorMessage(null)
        // Detener polling si está conectado
        stopPolling()
        onStatusChange?.('connected')
        return
      }

      if (statusData.status === 'pending') {
        // Asegurar que el QR tenga el formato correcto para mostrarse como imagen
        let qrCode = statusData.qr || ''
        
        // Si el QR no tiene el prefijo data:image, agregarlo
        if (qrCode && !qrCode.startsWith('data:image')) {
          // Si es base64 puro, agregar el prefijo
          if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
            qrCode = `data:image/png;base64,${qrCode}`
            console.log('[WhatsAppQRConnector] ✅ QR formateado correctamente (agregado prefijo data:image)')
          } else {
            console.warn('[WhatsAppQRConnector] ⚠️ QR en formato desconocido:', qrCode.substring(0, 50))
          }
        }
        
        console.log('[WhatsAppQRConnector] 📱 QR recibido:', {
          hasQR: !!qrCode,
          qrLength: qrCode.length,
          qrPreview: qrCode.substring(0, 50),
          hasDataPrefix: qrCode.startsWith('data:image')
        })
        
        setState('pending')
        setSessionData({
          status: 'pending',
          qr: qrCode,
          sessionName: statusData.sessionName,
          expiresIn: statusData.expiresIn
        })
        setErrorMessage(null)
        onStatusChange?.('pending')
        return
      }

      // Estado desconocido
      setState('error')
      setErrorMessage('Estado de sesión desconocido')
      onStatusChange?.('error')
    } catch (error) {
      console.error('[WhatsAppQRConnector] ❌ Error verificando estado:', error)
      
      // Log detallado del error
      if (error instanceof Error) {
        console.error('[WhatsAppQRConnector] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al verificar estado de WhatsApp')
      onStatusChange?.('error')
      stopPolling()
    }
  }, [onStatusChange])

  // Función para iniciar polling
  const startPolling = useCallback(() => {
    // Limpiar polling anterior si existe
    stopPolling()

    pollingStartTimeRef.current = Date.now()

    pollingIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (pollingStartTimeRef.current || 0)
      
      // Detener si pasaron 5 minutos
      if (elapsed >= MAX_POLLING_TIME) {
        console.log('[WhatsAppQRConnector] Polling detenido: tiempo máximo alcanzado')
        stopPolling()
        return
      }

      checkSessionStatus()
    }, POLLING_INTERVAL)
  }, [checkSessionStatus])

  // Función para detener polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    pollingStartTimeRef.current = null
  }, [])

  // Verificar estado al montar
  useEffect(() => {
    console.log('[WhatsAppQRConnector] 🔄 useEffect ejecutándose, llamando checkSessionStatus...')
    console.log('[WhatsAppQRConnector] 📍 Estado actual:', { state, hasSessionData: !!sessionData })
    checkSessionStatus().catch(err => {
      console.error('[WhatsAppQRConnector] ❌ Error en checkSessionStatus desde useEffect:', err)
    })
  }, [checkSessionStatus])

  // Iniciar polling si hay QR
  useEffect(() => {
    if (state === 'pending' && sessionData?.qr) {
      startPolling()
    } else {
      stopPolling()
    }

    // Cleanup al desmontar
    return () => {
      stopPolling()
    }
  }, [state, sessionData?.qr, startPolling, stopPolling])

  // Función para generar nuevo QR
  const handleGenerateQR = async () => {
    setIsGeneratingQR(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al generar QR')
      }

      // Formatear QR correctamente
      let qrCode = data.data.qr || ''
      if (qrCode && !qrCode.startsWith('data:image')) {
        if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
          qrCode = `data:image/png;base64,${qrCode}`
        }
      }

      // Actualizar estado con nuevo QR
      setState('pending')
      setSessionData({
        status: 'pending',
        qr: qrCode,
        sessionName: data.data.sessionName,
        expiresIn: data.data.expiresIn
      })
      setErrorMessage(null)
      onStatusChange?.('pending')
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error generando QR:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al generar QR')
      onStatusChange?.('error')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Función para desconectar
  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al desconectar')
      }

      // Actualizar estado
      setState('pending')
      setSessionData(null)
      setErrorMessage(null)
      onStatusChange?.('pending')
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error desconectando:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Error al desconectar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Función para cambiar número (reiniciar sesión)
  const handleChangeNumber = async () => {
    setIsChangingNumber(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al reiniciar sesión')
      }

      // Formatear QR correctamente
      let qrCode = data.data.qr || ''
      if (qrCode && !qrCode.startsWith('data:image')) {
        if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
          qrCode = `data:image/png;base64,${qrCode}`
        }
      }
      
      // Actualizar estado con nuevo QR
      setState('pending')
      setSessionData({
        status: 'pending',
        qr: qrCode,
        sessionName: data.data.sessionName,
        expiresIn: data.data.expiresIn
      })
      setErrorMessage(null)
      onStatusChange?.('pending')
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error cambiando número:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al cambiar número')
      onStatusChange?.('error')
    } finally {
      setIsChangingNumber(false)
    }
  }

  // Función para reintentar
  const handleRetry = () => {
    setState('loading')
    setErrorMessage(null)
    onStatusChange?.('loading')
    checkSessionStatus()
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className={cn('h-6 w-6', darkMode ? 'text-primary' : 'text-text-primary')} />
            <div>
              <CardTitle>Conexión de WhatsApp</CardTitle>
              <CardDescription>
                Vincula tu WhatsApp Business para recibir y enviar mensajes
              </CardDescription>
            </div>
          </div>
          {state === 'loading' && (
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Estado: Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-text-secondary">Verificando estado de conexión...</p>
          </div>
        )}

        {/* Estado: Connected */}
        {state === 'connected' && sessionData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="success">Conectado</Badge>
                </div>
                {sessionData.name && (
                  <p className="text-sm font-medium text-text-primary">{sessionData.name}</p>
                )}
                {sessionData.phone && (
                  <p className="text-sm text-text-secondary">{sessionData.phone}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleChangeNumber}
                disabled={isChangingNumber}
                className="flex-1"
              >
                {isChangingNumber ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Cambiar número
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Unplug className="mr-2 h-4 w-4" />
                    Desconectar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Estado: Pending con QR */}
        {state === 'pending' && sessionData?.qr && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-warning" />
              <Badge variant="warning">Pendiente de conexión</Badge>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white border border-border rounded-lg">
                <img
                  src={sessionData.qr}
                  alt="QR Code para vincular WhatsApp"
                  className="w-64 h-64 mx-auto object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                  onError={(e) => {
                    console.error('[WhatsAppQRConnector] ❌ Error cargando imagen QR:', e)
                    console.error('[WhatsAppQRConnector] QR value:', sessionData.qr?.substring(0, 100))
                  }}
                  onLoad={() => {
                    console.log('[WhatsAppQRConnector] ✅ Imagen QR cargada correctamente')
                  }}
                />
              </div>

              <div className="text-center space-y-2 max-w-md">
                <p className="text-sm font-medium text-text-primary">
                  Escanea este código QR con WhatsApp
                </p>
                <ol className="text-sm text-text-secondary space-y-1 text-left list-decimal list-inside">
                  <li>Abre WhatsApp en tu teléfono</li>
                  <li>Ve a Configuración → Dispositivos vinculados</li>
                  <li>Toca "Vincular un dispositivo"</li>
                  <li>Escanea este código QR</li>
                </ol>
                {sessionData.expiresIn && (
                  <p className="text-xs text-text-muted mt-2">
                    El código expira en {sessionData.expiresIn} segundos
                  </p>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={handleGenerateQR}
                disabled={isGeneratingQR}
              >
                {isGeneratingQR ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generar nuevo QR
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Estado: Pending sin QR */}
        {state === 'pending' && !sessionData?.qr && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-warning" />
              <Badge variant="warning">No conectado</Badge>
            </div>

            <div className="text-center space-y-4 py-4">
              <p className="text-text-secondary">
                No hay una sesión activa. Genera un código QR para vincular WhatsApp.
              </p>
              <Button
                variant="primary"
                onClick={handleGenerateQR}
                disabled={isGeneratingQR}
                size="lg"
              >
                {isGeneratingQR ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Vincular WhatsApp
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Estado: Error */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-lg">
              <XCircle className="h-6 w-6 text-error flex-shrink-0" />
              <div className="flex-1">
                <Badge variant="error">Error</Badge>
                {errorMessage && (
                  <p className="text-sm text-text-secondary mt-2">{errorMessage}</p>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleRetry}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

