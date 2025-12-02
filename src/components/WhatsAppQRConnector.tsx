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
  Loader2,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

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

const POLLING_INTERVAL = 5000 // 5 segundos (reducido de 3 para evitar spam)
const MAX_POLLING_TIME = 5 * 60 * 1000 // 5 minutos
const QR_POLLING_INTERVAL = 10000 // 10 segundos cuando hay QR (menos frecuente)

export function WhatsAppQRConnector({
  onStatusChange,
  className,
  darkMode = true
}: WhatsAppQRConnectorProps) {
  // Usar un ref para evitar logs múltiples en Strict Mode
  const mountCountRef = useRef(0)
  const componentIdRef = useRef(Math.random().toString(36).substring(7))
  
  mountCountRef.current += 1
  if (mountCountRef.current === 1) {
    console.log(`[WhatsAppQRConnector] 🚀 Componente montándose... [ID: ${componentIdRef.current}]`)
  }
  
  const [state, setState] = useState<'loading' | 'connected' | 'pending' | 'error'>('loading')
  const [sessionData, setSessionData] = useState<SessionStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isChangingNumber, setIsChangingNumber] = useState(false)
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  const hasCheckedInitialStatusRef = useRef(false)
  const currentStateRef = useRef<'loading' | 'connected' | 'pending' | 'error'>('loading')
  const onStatusChangeRef = useRef(onStatusChange)
  const isInitializingRef = useRef(false)
  const isCheckingStatusRef = useRef(false)

  // Actualizar ref cuando cambia onStatusChange
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  // Función para detener polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    pollingStartTimeRef.current = null
  }, [])

  // Función para verificar estado de sesión
  const checkSessionStatus = useCallback(async () => {
    // Evitar múltiples llamadas simultáneas (pero permitir la primera)
    if (isCheckingStatusRef.current) {
      console.log(`[WhatsAppQRConnector] ⏸️ Verificación ya en progreso, omitiendo... [ID: ${componentIdRef.current}]`)
      return
    }
    
    // Marcar como en progreso
    isCheckingStatusRef.current = true
    
    try {
      console.log(`[WhatsAppQRConnector] 🔍 Verificando estado de sesión... [ID: ${componentIdRef.current}]`)
      const response = await fetch('/api/whatsapp/session', {
        credentials: 'include',
        cache: 'no-store'
      })
      
      // Verificar si la respuesta es OK
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[WhatsAppQRConnector] ❌ Error HTTP:', response.status, errorText)
        throw new Error(`Error ${response.status}: ${errorText || 'Error al verificar estado'}`)
      }
      
      const data = await response.json()
      console.log('[WhatsAppQRConnector] 📦 Respuesta recibida:', { 
        success: data.success, 
        status: data.status,
        connected: data.connected,
        dataStatus: data.data?.status 
      })

      if (!data.success) {
        const errorMsg = data.error || 'Error al verificar estado'
        const hint = data.hint ? `\n\n💡 ${data.hint}` : ''
        const debug = data.debug ? `\n\n🔍 Debug: ${JSON.stringify(data.debug, null, 2)}` : ''
        throw new Error(`${errorMsg}${hint}${debug}`)
      }

      const statusData = data.data || data

      // Verificar que statusData existe antes de usarlo
      if (!statusData) {
        console.error('[WhatsAppQRConnector] ❌ statusData es undefined')
        throw new Error('No se recibió información de estado de sesión')
      }

      // Detectar si está conectado: status 'connected', 'WORKING', o connected: true
      const isConnected = statusData?.status === 'connected' || 
                         data.status === 'WORKING' || 
                         data.connected === true ||
                         statusData?.sessionStatus === 'WORKING'

      if (isConnected) {
        currentStateRef.current = 'connected'
        setState('connected')
        setSessionData({
          status: 'connected',
          phone: statusData?.phone || data.phone,
          name: statusData?.name || data.name
        })
        setErrorMessage(null)
        // Detener polling si está conectado
        stopPolling()
        if (isMountedRef.current) {
          onStatusChangeRef.current?.('connected')
        }
        // Liberar flag de verificación
        isCheckingStatusRef.current = false
        return
      }

      // Verificar que statusData.status existe antes de usarlo
      // Manejar múltiples estados que requieren QR: pending, SCAN_QR, SCAN_QR_CODE, STARTING
      const needsQR = statusData && (
        statusData.status === 'pending' ||
        statusData.status === 'SCAN_QR' ||
        statusData.status === 'SCAN_QR_CODE' ||
        statusData.status === 'STARTING' ||
        data.status === 'SCAN_QR' ||
        data.status === 'SCAN_QR_CODE'
      )

      if (needsQR) {
        // El QR puede venir en dos formatos:
        // 1. String que debe convertirse a QR (formato 'value' de WAHA)
        // 2. Data URI de imagen base64 (formato antiguo)
        // El QR puede estar en statusData.qr o data.qr
        let qrCode = statusData.qr || data.qr || ''
        
        // Detectar si es un string que debe convertirse a QR (no es base64 ni data URI)
        const isQRString = qrCode && 
          !qrCode.startsWith('data:image') && 
          !qrCode.match(/^[A-Za-z0-9+/=]+$/) &&
          qrCode.length > 0
        
        // Si es un string que debe convertirse a QR, guardarlo tal cual
        if (isQRString) {
          console.log('[WhatsAppQRConnector] 📱 QR recibido como string (formato value):', {
            hasQR: !!qrCode,
            qrLength: qrCode.length,
            qrPreview: qrCode.substring(0, 50),
            type: 'string-to-qr'
          })
        } else {
          // Formato antiguo: intentar formatear como imagen base64
          if (qrCode && !qrCode.startsWith('data:image')) {
            // Si es base64 puro, agregar el prefijo
            if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
              qrCode = `data:image/png;base64,${qrCode}`
              console.log('[WhatsAppQRConnector] ✅ QR formateado correctamente (agregado prefijo data:image)')
            } else {
              console.warn('[WhatsAppQRConnector] ⚠️ QR en formato desconocido:', qrCode.substring(0, 50))
            }
          }
          
          console.log('[WhatsAppQRConnector] 📱 QR recibido como imagen:', {
            hasQR: !!qrCode,
            qrLength: qrCode.length,
            qrPreview: qrCode.substring(0, 50),
            hasDataPrefix: qrCode.startsWith('data:image'),
            type: 'image-base64'
          })
        }
        
        currentStateRef.current = 'pending'
        setState('pending')
        setSessionData({
          status: 'pending',
          qr: qrCode,
          sessionName: statusData.sessionName || data.sessionName || data.session,
          expiresIn: statusData.expiresIn || data.expiresIn
        })
        setErrorMessage(null)
        if (isMountedRef.current) {
          onStatusChangeRef.current?.('pending')
        }
        // Liberar flag de verificación
        isCheckingStatusRef.current = false
        return
      }

      // Estado desconocido
      if (isMountedRef.current) {
        currentStateRef.current = 'error'
        setState('error')
        setErrorMessage('Estado de sesión desconocido')
        onStatusChangeRef.current?.('error')
      }
    } catch (error) {
      console.error(`[WhatsAppQRConnector] ❌ Error verificando estado [ID: ${componentIdRef.current}]:`, error)
      
      // Log detallado del error
      if (error instanceof Error) {
        console.error('[WhatsAppQRConnector] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      
      if (isMountedRef.current) {
        currentStateRef.current = 'error'
        setState('error')
        setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al verificar estado de WhatsApp')
        onStatusChangeRef.current?.('error')
        stopPolling()
      }
    } finally {
      // Siempre liberar el flag al terminar (éxito o error)
      isCheckingStatusRef.current = false
    }
  }, [stopPolling])

  // Función para iniciar polling
  const startPolling = useCallback(() => {
    // Si ya está conectado, no hacer polling
    if (currentStateRef.current === 'connected') {
      console.log(`[WhatsAppQRConnector] ⚠️ Ya conectado, no iniciar polling [ID: ${componentIdRef.current}]`)
      return
    }

    // Limpiar polling anterior si existe
    stopPolling()

    pollingStartTimeRef.current = Date.now()

    // Usar intervalo más largo si ya hay un QR (para evitar spam)
    const hasQR = sessionData?.qr
    const interval = hasQR ? QR_POLLING_INTERVAL : POLLING_INTERVAL
    
    console.log(`[WhatsAppQRConnector] 🔄 Iniciando polling (intervalo: ${interval}ms) [ID: ${componentIdRef.current}]`)

    pollingIntervalRef.current = setInterval(() => {
      // Verificar si el componente sigue montado
      if (!isMountedRef.current) {
        stopPolling()
        return
      }

      // Si ya está conectado, detener polling (usar ref para evitar closure)
      if (currentStateRef.current === 'connected') {
        console.log(`[WhatsAppQRConnector] ✅ Conectado durante polling, deteniendo... [ID: ${componentIdRef.current}]`)
        stopPolling()
        return
      }

      const elapsed = Date.now() - (pollingStartTimeRef.current || 0)
      
      // Detener si pasaron 5 minutos
      if (elapsed >= MAX_POLLING_TIME) {
        console.log(`[WhatsAppQRConnector] Polling detenido: tiempo máximo alcanzado [ID: ${componentIdRef.current}]`)
        stopPolling()
        return
      }

      // Solo verificar si no hay una verificación en progreso
      if (!isCheckingStatusRef.current) {
        checkSessionStatus()
      } else {
        console.log(`[WhatsAppQRConnector] ⏸️ Verificación en progreso, omitiendo polling [ID: ${componentIdRef.current}]`)
      }
    }, interval)
  }, [checkSessionStatus, stopPolling, sessionData?.qr])

  // Verificar estado al montar (solo una vez)
  useEffect(() => {
    // Protección contra múltiples inicializaciones
    if (hasCheckedInitialStatusRef.current || isInitializingRef.current) {
      return
    }

    // Marcar como inicializando
    isInitializingRef.current = true
    hasCheckedInitialStatusRef.current = true

    console.log(`[WhatsAppQRConnector] 🔄 Verificando estado inicial... [ID: ${componentIdRef.current}]`)
    
    checkSessionStatus().catch(err => {
      console.error(`[WhatsAppQRConnector] ❌ Error en checkSessionStatus desde useEffect [ID: ${componentIdRef.current}]:`, err)
    }).finally(() => {
      isInitializingRef.current = false
    })

    // Cleanup al desmontar
    return () => {
      console.log(`[WhatsAppQRConnector] 🧹 Limpiando componente... [ID: ${componentIdRef.current}]`)
      isMountedRef.current = false
      stopPolling()
      // Resetear flags para permitir re-inicialización si el componente se vuelve a montar
      hasCheckedInitialStatusRef.current = false
      isInitializingRef.current = false
    }
  }, [checkSessionStatus, stopPolling]) // Incluir dependencias necesarias

  // Actualizar ref cuando cambia el estado
  useEffect(() => {
    currentStateRef.current = state
  }, [state])

  // Iniciar polling solo si hay QR y no está conectado
  useEffect(() => {
    // Si ya está conectado, no hacer polling
    if (state === 'connected') {
      console.log(`[WhatsAppQRConnector] ✅ Conectado, deteniendo polling [ID: ${componentIdRef.current}]`)
      stopPolling()
      return
    }

    // Solo hacer polling si hay QR pendiente Y no hay una verificación en progreso
    if (state === 'pending' && sessionData?.qr && !isCheckingStatusRef.current) {
      // Esperar un poco antes de iniciar polling para evitar spam
      const timeoutId = setTimeout(() => {
        if (state === 'pending' && sessionData?.qr && !isCheckingStatusRef.current) {
          console.log(`[WhatsAppQRConnector] 🔄 Iniciando polling para verificar conexión... [ID: ${componentIdRef.current}]`)
          startPolling()
        }
      }, 2000) // Esperar 2 segundos antes de iniciar polling

      return () => {
        clearTimeout(timeoutId)
        stopPolling()
      }
    } else {
      stopPolling()
    }

    // Cleanup
    return () => {
      stopPolling()
    }
  }, [state, sessionData?.qr, startPolling, stopPolling]) // Dependencias necesarias

  // Función para generar nuevo QR
  const handleGenerateQR = async () => {
    setIsGeneratingQR(true)
    try {
      // Si ya hay una sesión, usar reconnect. Si no, el GET creará una nueva
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reconnect' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al generar QR')
      }

      // Verificar si la sesión ya está conectada (status WORKING o connected: true)
      const isConnected = data.status === 'WORKING' || 
                         data.connected === true ||
                         data.data?.status === 'connected' ||
                         data.data?.sessionStatus === 'WORKING'

      if (isConnected) {
        // Sesión ya conectada, mostrar estado conectado
        setState('connected')
        setSessionData({
          status: 'connected',
          phone: data.data?.phone || data.phone,
          name: data.data?.name || data.name
        })
        setErrorMessage(null)
        onStatusChangeRef.current?.('connected')
        return
      }

      // El QR puede venir como string (formato 'value') o como imagen base64
      const responseData = data.data || data
      let qrCode = responseData?.qr || ''
      
      // Detectar si es un string que debe convertirse a QR
      const isQRString = qrCode && 
        !qrCode.startsWith('data:image') && 
        !qrCode.match(/^[A-Za-z0-9+/=]+$/) &&
        qrCode.length > 0
      
      // Solo formatear como imagen si es base64 puro (formato antiguo)
      if (!isQRString && qrCode && !qrCode.startsWith('data:image')) {
        if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
          qrCode = `data:image/png;base64,${qrCode}`
        }
      }

      // Actualizar estado con nuevo QR
      currentStateRef.current = 'pending'
      setState('pending')
      setSessionData({
        status: 'pending',
        qr: qrCode,
        sessionName: responseData?.sessionName || data.sessionName,
        expiresIn: responseData?.expiresIn || data.expiresIn
      })
      setErrorMessage(null)
      onStatusChangeRef.current?.('pending')
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error generando QR:', error)
      currentStateRef.current = 'error'
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al generar QR')
      onStatusChangeRef.current?.('error')
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Función para desconectar
  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al desconectar')
      }

      // Resetear estado
      currentStateRef.current = 'pending'
      setState('pending')
      
      // Si hay QR en la respuesta, usarlo
      if (data.qr) {
        const qrValue = typeof data.qr === 'string' ? data.qr : (data.qr.value || data.qr.data || null)
        setSessionData({
          status: 'SCAN_QR',
          qr: qrValue,
          session: data.session
        })
      } else {
        // Si no hay QR, limpiar y reiniciar polling
        setSessionData({
          status: 'SCAN_QR',
          session: data.session
        })
        // Reiniciar polling para obtener el QR
        setTimeout(() => {
          checkSessionStatus()
        }, 2000)
      }
      
      setErrorMessage(null)
      onStatusChangeRef.current?.('pending')
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
        credentials: 'include',
        body: JSON.stringify({ action: 'change_number' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al cambiar número')
      }

      // Resetear estado a pending/SCAN_QR
      currentStateRef.current = 'pending'
      setState('pending')
      
      // Si hay QR en la respuesta, usarlo
      if (data.qr) {
        const qrValue = typeof data.qr === 'string' ? data.qr : (data.qr.value || data.qr.data || null)
        setSessionData({
          status: 'SCAN_QR',
          qr: qrValue,
          session: data.session
        })
      } else {
        // Si no hay QR, limpiar y reiniciar polling
        setSessionData({
          status: 'SCAN_QR',
          session: data.session
        })
        // Reiniciar polling para obtener el QR
        setTimeout(() => {
          checkSessionStatus()
        }, 2000)
      }
      
      setErrorMessage(null)
      onStatusChangeRef.current?.('pending')
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error cambiando número:', error)
      currentStateRef.current = 'error'
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al cambiar número')
      onStatusChangeRef.current?.('error')
    } finally {
      setIsChangingNumber(false)
    }
  }

  // Función para reintentar
  const handleRetry = () => {
    currentStateRef.current = 'loading'
    setState('loading')
    setErrorMessage(null)
    setDiagnosticResult(null)
    onStatusChangeRef.current?.('loading')
    checkSessionStatus()
  }

  // Función para ejecutar diagnóstico
  const handleDiagnose = async () => {
    setIsDiagnosing(true)
    setDiagnosticResult(null)
    try {
      const response = await fetch('/api/whatsapp/diagnose')
      const data = await response.json()
      setDiagnosticResult(data.diagnostics)
    } catch (error) {
      console.error('[WhatsAppQRConnector] Error ejecutando diagnóstico:', error)
      setDiagnosticResult({
        error: 'Error al ejecutar diagnóstico: ' + (error instanceof Error ? error.message : 'Error desconocido')
      })
    } finally {
      setIsDiagnosing(false)
    }
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
                {/* Detectar si el QR es un string que debe convertirse a QR o una imagen base64 */}
                {sessionData.qr && !sessionData.qr.startsWith('data:image') && 
                 !sessionData.qr.match(/^[A-Za-z0-9+/=]+$/) ? (
                  // Formato 'value': string que debe convertirse a QR visualmente
                  <div className="flex items-center justify-center">
                    <QRCodeSVG 
                      value={sessionData.qr} 
                      size={256}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  // Formato antiguo: imagen base64
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
                )}
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

            {/* Mensaje especial si es error de configuración faltante */}
            {(errorMessage?.includes('Configuración del servidor') || 
              errorMessage?.includes('WAHA_API_URL') || 
              errorMessage?.includes('no están configuradas') ||
              errorMessage?.includes('no encontrada')) && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
                <p className="text-sm font-medium text-text-primary">
                  ⚠️ No se puede conectar con WhatsApp
                </p>
                <p className="text-sm text-text-secondary">
                  El servidor de WhatsApp no está configurado correctamente. Por favor, contacta al administrador del sistema o al soporte técnico para resolver este problema.
                </p>
                <p className="text-xs text-text-muted italic">
                  Si eres administrador, puedes configurar el servidor en la sección de configuración avanzada (arriba en esta página).
                </p>
              </div>
            )}

            {/* Resultado de diagnóstico */}
            {diagnosticResult && (
              <div className="p-4 bg-bg-secondary border border-border rounded-lg space-y-3 max-h-96 overflow-y-auto">
                <p className="text-sm font-medium text-text-primary">
                  🔍 Resultado del diagnóstico
                </p>
                {diagnosticResult.summary && (
                  <p className="text-sm text-text-secondary">{diagnosticResult.summary}</p>
                )}
                {diagnosticResult.errors && diagnosticResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-error">Errores encontrados:</p>
                    <ul className="text-xs text-text-secondary list-disc list-inside space-y-1">
                      {diagnosticResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnosticResult.warnings && diagnosticResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-warning">Advertencias:</p>
                    <ul className="text-xs text-text-secondary list-disc list-inside space-y-1">
                      {diagnosticResult.warnings.map((warn: string, idx: number) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnosticResult.recommendations && diagnosticResult.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-text-primary">Recomendaciones:</p>
                    <ul className="text-xs text-text-secondary list-disc list-inside space-y-1">
                      {diagnosticResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnosticResult.checks && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-text-muted hover:text-text-secondary">
                      Ver detalles técnicos
                    </summary>
                    <pre className="mt-2 p-2 bg-bg-primary rounded text-xs overflow-auto">
                      {JSON.stringify(diagnosticResult.checks, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleRetry}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
              <Button
                variant="outline"
                onClick={handleDiagnose}
                disabled={isDiagnosing}
                className="flex-1"
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Diagnosticando...
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Diagnosticar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

