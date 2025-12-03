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
import { QRCodeSVG } from 'qrcode.react'

interface WhatsAppQRConnectorProps {
  onStatusChange?: (status: 'loading' | 'connected' | 'pending' | 'error') => void
  className?: string
  darkMode?: boolean
}

interface SessionData {
  status: string
  connected: boolean
  phone?: string
  name?: string
  qr?: string
  session?: string
  message?: string
}

const POLLING_INTERVAL = 8000 // 8 segundos - más relajado
const MAX_RETRIES = 40 // 8s * 40 = 5 minutos máximo

export function WhatsAppQRConnectorSimple({
  onStatusChange,
  className,
  darkMode = true
}: WhatsAppQRConnectorProps) {
  const [state, setState] = useState<'loading' | 'connected' | 'pending' | 'error'>('loading')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const componentIdRef = useRef(Math.random().toString(36).substring(7))
  const hasInitializedRef = useRef(false)

  // Detener polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log(`[WhatsApp Simple] ⏸️ Polling detenido`)
    }
    retryCountRef.current = 0
  }, [])

  // Verificar estado
  const checkStatus = useCallback(async () => {
    try {
      console.log(`[WhatsApp Simple] 🔍 Verificando estado... (intento ${retryCountRef.current + 1}/${MAX_RETRIES})`)
      
      const response = await fetch('/api/whatsapp/session', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: SessionData = await response.json()
      console.log(`[WhatsApp Simple] 📦 Respuesta:`, data)

      // CONECTADO
      if (data.connected || data.status === 'WORKING') {
        console.log(`[WhatsApp Simple] ✅ Conectado: ${data.phone || 'N/A'}`)
        setState('connected')
        setSessionData(data)
        setErrorMessage(null)
        stopPolling()
        onStatusChange?.('connected')
        return
      }

      // TIENE QR
      const qr = data.qr
      if (qr && typeof qr === 'string' && qr.length > 20) {
        console.log(`[WhatsApp Simple] 📱 QR recibido: ${qr.length} caracteres`)
        setState('pending')
        setSessionData(data)
        setErrorMessage(null)
        onStatusChange?.('pending')
        // Seguir polling para detectar cuando se conecte
        return
      }

      // ESPERANDO QR
      console.log(`[WhatsApp Simple] ⏳ Esperando QR... Estado: ${data.status}`)
      setState('pending')
      setSessionData(data)
      setErrorMessage(data.message || 'Esperando código QR...')

      // Incrementar contador de reintentos
      retryCountRef.current += 1

      // Si excedemos reintentos, parar
      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn(`[WhatsApp Simple] ⚠️ Máximo de reintentos alcanzado`)
        stopPolling()
        setErrorMessage('Tiempo de espera agotado. Recarga la página o haz clic en "Vincular WhatsApp".')
      }

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error verificando estado:`, error)
      setState('error')
      setErrorMessage(error.message)
      onStatusChange?.('error')
    }
  }, [onStatusChange, stopPolling])

  // Iniciar polling
  const startPolling = useCallback(() => {
    stopPolling() // Detener cualquier polling anterior
    retryCountRef.current = 0
    
    console.log(`[WhatsApp Simple] ▶️ Iniciando polling (${POLLING_INTERVAL}ms)`)
    
    // Primera verificación inmediata
    checkStatus()
    
    // Polling
    pollingIntervalRef.current = setInterval(checkStatus, POLLING_INTERVAL)
  }, [checkStatus, stopPolling])

  // Efecto inicial - verificar estado una sola vez al montar
  useEffect(() => {
    // Prevenir múltiples inicializaciones
    if (hasInitializedRef.current) {
      console.log(`[WhatsApp Simple] ⏸️ Ya inicializado, ignorando re-mount`)
      return
    }
    
    hasInitializedRef.current = true
    console.log(`[WhatsApp Simple] 🚀 Componente montado [ID: ${componentIdRef.current}]`)
    
    checkStatus()
    
    return () => {
      console.log(`[WhatsApp Simple] 👋 Componente desmontado [ID: ${componentIdRef.current}]`)
      stopPolling()
    }
  }, []) // Solo al montar

  // Generar QR / Vincular
  const handleGenerateQR = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    console.log(`[WhatsApp Simple] 🔄 Generando QR...`)

    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[WhatsApp Simple] ✅ Respuesta:`, data)

      // Iniciar polling para obtener el QR
      startPolling()

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error generando QR:`, error)
      setErrorMessage(error.message)
      setState('error')
    } finally {
      setIsLoading(false)
    }
  }, [startPolling])

  // Desconectar
  const handleDisconnect = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    console.log(`[WhatsApp Simple] 🔓 Desconectando...`)

    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[WhatsApp Simple] ✅ Desconectado:`, data)

      // Si viene QR, mostrarlo
      if (data.qr) {
        setState('pending')
        setSessionData(data)
        startPolling()
      } else {
        // Si no, iniciar polling para obtenerlo
        startPolling()
      }

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error desconectando:`, error)
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [startPolling])

  // Cambiar número
  const handleChangeNumber = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    console.log(`[WhatsApp Simple] 🔄 Cambiando número...`)

    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_number' }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[WhatsApp Simple] ✅ Respuesta:`, data)

      // Si viene QR, mostrarlo
      if (data.qr) {
        setState('pending')
        setSessionData(data)
        startPolling()
      } else {
        // Si no, iniciar polling para obtenerlo
        startPolling()
      }

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error cambiando número:`, error)
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [startPolling])

  // UI
  const isQRImage = sessionData?.qr?.startsWith('data:image')
  const isQRString = sessionData?.qr && !isQRImage && (sessionData.qr.includes('@') || sessionData.qr.includes('&'))

  return (
    <Card className={cn('w-full', darkMode && 'bg-slate-900 border-slate-800', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className={cn('h-6 w-6', darkMode ? 'text-cyan-400' : 'text-cyan-600')} />
            <div>
              <CardTitle className={cn(darkMode && 'text-white')}>
                Conexión WhatsApp
              </CardTitle>
              <CardDescription className={cn(darkMode && 'text-slate-400')}>
                Vincula tu número de WhatsApp
              </CardDescription>
            </div>
          </div>

          {/* Badge de estado */}
          {state === 'connected' && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Conectado
            </Badge>
          )}
          {state === 'pending' && (
            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <QrCode className="w-4 h-4 mr-1" />
              Esperando escaneo
            </Badge>
          )}
          {state === 'loading' && (
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Verificando...
            </Badge>
          )}
          {state === 'error' && (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
              <XCircle className="w-4 h-4 mr-1" />
              Error
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CONECTADO */}
        {state === 'connected' && sessionData && (
          <div className="space-y-4">
            <div className={cn(
              'p-4 rounded-lg border',
              darkMode ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'
            )}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className={cn('font-medium', darkMode ? 'text-white' : 'text-gray-900')}>
                    WhatsApp conectado
                  </p>
                  <p className={cn('text-sm', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                    Número: {sessionData.phone || 'No disponible'}
                  </p>
                  {sessionData.name && (
                    <p className={cn('text-sm', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                      Nombre: {sessionData.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleChangeNumber}
                disabled={isLoading}
                variant="outline"
                className={cn(darkMode && 'border-slate-700 text-slate-300 hover:bg-slate-800')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Cambiar número
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={isLoading}
                variant="outline"
                className={cn(darkMode && 'border-slate-700 text-slate-300 hover:bg-slate-800')}
              >
                <Unplug className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            </div>
          </div>
        )}

        {/* ESPERANDO QR */}
        {state === 'pending' && (
          <div className="space-y-4">
            {sessionData?.qr && (isQRString || isQRImage) ? (
              <>
                <div className={cn(
                  'p-6 rounded-lg border flex justify-center',
                  darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'
                )}>
                  {isQRString ? (
                    <QRCodeSVG
                      value={sessionData.qr}
                      size={256}
                      level="M"
                      includeMargin={true}
                    />
                  ) : (
                    <img
                      src={sessionData.qr}
                      alt="QR Code"
                      className="w-64 h-64 object-contain"
                    />
                  )}
                </div>
                <p className={cn('text-sm text-center', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                  Escanea este código QR con WhatsApp en tu teléfono
                </p>
                <p className={cn('text-xs text-center', darkMode ? 'text-slate-500' : 'text-gray-500')}>
                  El código se actualizará automáticamente cuando se conecte
                </p>
              </>
            ) : (
              <div className={cn(
                'p-6 rounded-lg border flex flex-col items-center gap-3',
                darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'
              )}>
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                <p className={cn('text-sm', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                  {sessionData?.message || 'Generando código QR...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* NO CONECTADO / ERROR */}
        {(state === 'loading' || state === 'error') && (
          <div className="space-y-4">
            {errorMessage && (
              <div className={cn(
                'p-4 rounded-lg border',
                darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
              )}>
                <p className={cn('text-sm', darkMode ? 'text-red-400' : 'text-red-600')}>
                  {errorMessage}
                </p>
              </div>
            )}

            <Button
              onClick={handleGenerateQR}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Vincular WhatsApp
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

