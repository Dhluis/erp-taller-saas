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
  const [showRefreshBanner, setShowRefreshBanner] = useState(false)
  const [actionPerformed, setActionPerformed] = useState<'disconnect' | 'change_number' | 'connect' | null>(null)
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState<number | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const componentIdRef = useRef(Math.random().toString(36).substring(7))
  const hasInitializedRef = useRef(false)
  const lastPhaseRef = useRef<'waiting' | 'has_qr' | null>(null) // Rastrear fase actual
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastConnectionEventRef = useRef<string | null>(null) // Rastrear último teléfono que disparó evento
  const previousStateRef = useRef<'loading' | 'connected' | 'pending' | 'error' | null>(null) // Rastrear estado anterior
  const isFirstLoadRef = useRef(true) // ✅ NUEVO: Rastrear primera carga
  const savedQRRef = useRef<string | null>(null) // ✅ Guardar QR para no perderlo cuando el backend no lo retorna temporalmente

  // Limpiar timers de auto-refresh
  const clearAutoRefreshTimers = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current)
      autoRefreshTimerRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setAutoRefreshCountdown(null)
  }, [])

  // Detener polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log(`[WhatsApp Simple] ⏸️ Polling detenido`)
    }
    retryCountRef.current = 0
    lastPhaseRef.current = null // Resetear fase también
  }, [])

  // Verificar estado
  const checkStatus = useCallback(async () => {
    try {
      // ✅ AGREGAR: Delay inicial solo en primera carga
      if (isFirstLoadRef.current) {
        console.log(`[WhatsApp Simple] ⏳ Primera carga en checkStatus, esperando 300ms...`)
        await new Promise(resolve => setTimeout(resolve, 300))
        isFirstLoadRef.current = false
      }

      const response = await fetch('/api/whatsapp/session', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido')
        console.error(`[WhatsApp Simple] ❌ Error HTTP ${response.status} en checkStatus:`, errorText)
        throw new Error(`HTTP ${response.status}`)
      }

      const data: SessionData = await response.json()
      console.log(`[WhatsApp Simple] 📦 Respuesta:`, data)

      // CONECTADO
      if (data.connected || data.status === 'WORKING') {
        console.log(`[WhatsApp Simple] ✅ Conectado: ${data.phone || 'N/A'}`)
        
        // ✅ IMPORTANTE: Solo actualizar estado si realmente cambió de no-conectado a conectado
        // O si el teléfono cambió (para evitar loops)
        const wasNotConnected = previousStateRef.current !== 'connected'
        const phoneChanged = sessionData?.phone !== data.phone
        const isNewConnection = wasNotConnected && data.phone && lastConnectionEventRef.current !== data.phone
        
        if (wasNotConnected || phoneChanged) {
          console.log(`[WhatsApp Simple] 🔄 Actualizando estado a conectado (wasNotConnected: ${wasNotConnected}, phoneChanged: ${phoneChanged})`)
          setState('connected')
          setSessionData(data)
          setErrorMessage(null)
          previousStateRef.current = 'connected'
          
          // Solo llamar onStatusChange si realmente cambió el estado
          if (wasNotConnected) {
          onStatusChange?.('connected')
          }
          
          // Disparar evento personalizado solo si es una nueva conexión (no en cada montaje)
          if (isNewConnection) {
            console.log(`[WhatsApp Simple] 🔔 Disparando evento de conexión (nueva conexión)`)
            lastConnectionEventRef.current = data.phone
            window.dispatchEvent(new CustomEvent('whatsapp:connected', {
              detail: { phone: data.phone, name: data.name }
            }))
          }
          
          // Limpiar acción si acabamos de vincular
          if (actionPerformed === 'connect') {
            console.log(`[WhatsApp Simple] 📱 Acabamos de vincular, estado actualizado sin recargar`)
            setActionPerformed(null)
          }
        } else {
          // Ya estábamos conectados, solo actualizar datos si el teléfono cambió
          if (phoneChanged) {
            console.log(`[WhatsApp Simple] 📱 Teléfono actualizado: ${data.phone}`)
            setSessionData(data)
            lastConnectionEventRef.current = data.phone
          }
        }
        
        // NO detener polling - mantenerlo activo para detectar desconexiones
        // El polling continuará verificando el estado periódicamente
        
        return
      }

      // TIENE QR - solo mostrar si el usuario presionó "Vincular WhatsApp"
      // ✅ IMPORTANTE: No mostrar QR automáticamente - solo si actionPerformed === 'connect'
      const qr = data.qr
      // ✅ Si no hay QR en la respuesta pero tenemos uno guardado, usar el guardado
      const effectiveQR = (qr && typeof qr === 'string' && qr.length > 20) ? qr : savedQRRef.current
      
      // ✅ Solo mostrar QR si el usuario inició la acción de conectar
      if (effectiveQR && typeof effectiveQR === 'string' && effectiveQR.length > 20 && actionPerformed === 'connect') {
        // ✅ Guardar QR si es nuevo o diferente
        if (!savedQRRef.current || savedQRRef.current !== effectiveQR) {
          savedQRRef.current = effectiveQR
          console.log(`[WhatsApp Simple] 💾 QR guardado: ${effectiveQR.length} caracteres`)
        }
        
        // Si cambiamos de fase "esperando" a "tiene QR", resetear contador
        if (lastPhaseRef.current !== 'has_qr') {
          console.log(`[WhatsApp Simple] 🔄 Cambio de fase: esperando → tiene QR (resetear contador)`)
          retryCountRef.current = 0
          lastPhaseRef.current = 'has_qr'
        }
        
        // Marcar que estamos esperando conexión (para mostrar banner cuando se conecte)
        if (actionPerformed === null) {
          setActionPerformed('connect')
        }
        
        // Incrementar contador después de verificar fase
        retryCountRef.current += 1
        
        console.log(`[WhatsApp Simple] 📱 QR ${qr ? 'recibido' : 'usando guardado'}: ${effectiveQR.length} caracteres (intento ${retryCountRef.current})`)
        const wasNotPending = previousStateRef.current !== 'pending'
        setState('pending')
        previousStateRef.current = 'pending'
        // ✅ Usar el QR efectivo (puede ser el guardado) en sessionData
        setSessionData({ ...data, qr: effectiveQR })
        setErrorMessage(null)
        if (wasNotPending) {
        onStatusChange?.('pending')
        }
        
        // Verificar directamente en WAHA si ya se conectó cada 3 intentos (~24 segundos)
        // (útil cuando el webhook no llega pero la conexión sí funciona)
        if (retryCountRef.current % 3 === 0) {
          console.log(`[WhatsApp Simple] 🔍 Verificando conexión directa en WAHA... (intento ${retryCountRef.current})`)
          try {
            const checkResponse = await fetch('/api/whatsapp/check-connection', {
              method: 'POST',
              credentials: 'include',
              cache: 'no-store'
            })
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json()
              console.log(`[WhatsApp Simple] 📊 Check en WAHA:`, checkData)
              
              if (checkData.connected) {
                console.log(`[WhatsApp Simple] ✅ ¡Conectado en WAHA! (detectado manualmente)`)
                const wasNotConnected = previousStateRef.current !== 'connected'
                const phoneChanged = sessionData?.phone !== checkData.phone
                const isNewConnection = wasNotConnected && checkData.phone && lastConnectionEventRef.current !== checkData.phone
                
                // Solo actualizar estado si realmente cambió
                if (wasNotConnected || phoneChanged) {
                  console.log(`[WhatsApp Simple] 🔄 Actualizando estado a conectado (detectado manualmente)`)
                  setState('connected')
                  setSessionData({
                    ...data,
                    connected: true,
                    phone: checkData.phone,
                    status: 'WORKING'
                  })
                  previousStateRef.current = 'connected'
                  
                  // Solo llamar onStatusChange si realmente cambió el estado
                  if (wasNotConnected) {
                  onStatusChange?.('connected')
                  }
                  
                  // ✅ Disparar evento personalizado solo si es una nueva conexión
                  if (isNewConnection) {
                    console.log(`[WhatsApp Simple] 🔔 Disparando evento de conexión (detectado manualmente, nueva conexión)`)
                    lastConnectionEventRef.current = checkData.phone
                    window.dispatchEvent(new CustomEvent('whatsapp:connected', {
                      detail: { phone: checkData.phone, name: checkData.name }
                    }))
                  }
                  
                  // Limpiar acción si acabamos de vincular
                  if (actionPerformed === 'connect') {
                    console.log(`[WhatsApp Simple] 📱 Acabamos de vincular (detectado manualmente), estado actualizado`)
                    setActionPerformed(null)
                  }
                }
                
                // NO detener polling - mantenerlo activo para detectar cambios
                return
              }
            }
          } catch (checkError) {
            console.warn(`[WhatsApp Simple] ⚠️ Error verificando en WAHA:`, checkError)
          }
        }
        
        // NO aplicar timeout cuando el QR está visible - seguir intentando hasta que se conecte
        // El QR es válido hasta que expire en WhatsApp (no nosotros)
        
        // Seguir polling para detectar cuando se conecte
        return
      }

      // ESPERANDO QR
      // ✅ IMPORTANTE: No cambiar a "esperando QR" si ya estamos conectados
      // Esto previene que el estado cambie de vuelta después de conectarse
      if (state === 'connected') {
        console.log(`[WhatsApp Simple] ⚠️ Ya conectado, ignorando cambio a "esperando QR"`)
        return
      }
      
      // ✅ IMPORTANTE: Si tenemos un QR guardado, NO cambiar a "esperando QR"
      // El backend puede no retornar el QR temporalmente, pero el QR sigue siendo válido
      if (savedQRRef.current && lastPhaseRef.current === 'has_qr') {
        console.log(`[WhatsApp Simple] ⚠️ QR guardado disponible, manteniendo estado "tiene QR" aunque backend no lo retorne`)
        // Usar el QR guardado y mantener el estado
        setSessionData({ ...data, qr: savedQRRef.current })
        return
      }
      
      // ✅ Solo cambiar a "esperando QR" si realmente no tenemos QR guardado
      // Si cambiamos de fase "tiene QR" a "esperando", resetear contador
      if (lastPhaseRef.current !== 'waiting') {
        console.log(`[WhatsApp Simple] 🔄 Cambio de fase: tiene QR → esperando (resetear contador)`)
        retryCountRef.current = 0
        lastPhaseRef.current = 'waiting'
        savedQRRef.current = null // Limpiar QR guardado solo cuando realmente cambiamos a "esperando"
      }
      
      // Incrementar contador después de verificar fase
      retryCountRef.current += 1
      
      console.log(`[WhatsApp Simple] ⏳ Esperando QR... Estado: ${data.status} (intento ${retryCountRef.current}/${MAX_RETRIES})`)
      setState('pending')
      previousStateRef.current = 'pending'
      setSessionData(data)
      setErrorMessage(data.message || 'Esperando código QR...')

      // Si excedemos reintentos mientras esperamos QR (no mientras se muestra), cambiar a error
      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn(`[WhatsApp Simple] ⚠️ Máximo de reintentos alcanzado esperando QR`)
        setState('error')
        setErrorMessage('Tiempo de espera agotado. Recarga la página o haz clic en "Vincular WhatsApp".')
        onStatusChange?.('error')
        stopPolling()
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

  // Efecto inicial - SOLO verificar si está conectado, NO mostrar QR automáticamente
  useEffect(() => {
    // Prevenir múltiples inicializaciones
    if (hasInitializedRef.current) {
      console.log(`[WhatsApp Simple] ⏸️ Ya inicializado, ignorando re-mount`)
      return
    }
    
    hasInitializedRef.current = true
    console.log(`[WhatsApp Simple] 🚀 Componente montado [ID: ${componentIdRef.current}]`)
    
    // ✅ SOLO verificar si está conectado (sin mostrar QR automáticamente)
    const checkIfConnected = async () => {
      try {
        const response = await fetch('/api/whatsapp/session', {
          credentials: 'include',
          cache: 'no-store'
        })

        if (response.ok) {
          const data: SessionData = await response.json()
          
          // ✅ SOLO actualizar estado si está conectado
          if (data.connected || data.status === 'WORKING') {
            console.log(`[WhatsApp Simple] ✅ Ya conectado al montar: ${data.phone || 'N/A'}`)
            setState('connected')
            setSessionData(data)
            previousStateRef.current = 'connected'
            
            // Iniciar polling solo para mantener estado actualizado cuando está conectado
            const initTimeout = setTimeout(() => {
              console.log(`[WhatsApp Simple] ▶️ Iniciando polling de mantenimiento (conectado)`)
              startPolling()
            }, 1000)
            
            return () => clearTimeout(initTimeout)
          } else {
            // ✅ NO está conectado - mostrar botón "Vincular WhatsApp" (NO QR automático)
            console.log(`[WhatsApp Simple] ℹ️ No conectado al montar, mostrando botón "Vincular WhatsApp"`)
            setState('loading') // Estado inicial para mostrar el botón
            // NO iniciar polling - esperar a que el usuario presione el botón
          }
        }
      } catch (error: any) {
        console.warn(`[WhatsApp Simple] ⚠️ Error verificando estado inicial:`, error.message)
        setState('error')
        setErrorMessage('Error al verificar estado de WhatsApp')
      }
    }
    
    checkIfConnected()
    
    return () => {
      console.log(`[WhatsApp Simple] 👋 Componente desmontado [ID: ${componentIdRef.current}]`)
      stopPolling()
      clearAutoRefreshTimers()
      // NO resetear lastConnectionEventRef ni previousStateRef al desmontar
      // para que si se vuelve a montar, no dispare eventos innecesarios
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo al montar - las funciones son estables con useCallback

  // Generar QR / Vincular
  const handleGenerateQR = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    console.log(`[WhatsApp Simple] 🔄 Generando QR...`)

    try {
      // ✅ IMPORTANTE: Marcar que el usuario inició la acción de conectar
      // Esto permite que el QR se muestre cuando se obtenga
      setActionPerformed('connect')

      // ✅ AGREGAR: Delay inicial solo en primera carga para evitar race condition
      if (isFirstLoadRef.current) {
        console.log(`[WhatsApp Simple] ⏳ Primera carga, esperando 500ms para inicialización...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        isFirstLoadRef.current = false
      }

      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconnect' }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido')
        console.error(`[WhatsApp Simple] ❌ Error HTTP ${response.status}:`, errorText)
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[WhatsApp Simple] ✅ Respuesta:`, data)

      // ✅ Si la respuesta ya incluye un QR, mostrarlo inmediatamente
      if (data.qr && typeof data.qr === 'string' && data.qr.length > 20) {
        console.log(`[WhatsApp Simple] 📱 QR recibido inmediatamente: ${data.qr.length} caracteres`)
        savedQRRef.current = data.qr
        setState('pending')
        setSessionData(data)
        previousStateRef.current = 'pending'
        lastPhaseRef.current = 'has_qr'
        retryCountRef.current = 0
      }

      // Iniciar polling para obtener el QR (si no vino en la respuesta) o detectar conexión
      startPolling()

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error generando QR:`, error)
      setErrorMessage(error.message)
      setState('error')
      setActionPerformed(null) // Limpiar acción si hay error
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

      // Marcar que realizamos una acción de desconexión
      setActionPerformed('disconnect')
      
      // ✅ Limpiar QR guardado al desconectar (necesitamos uno nuevo)
      savedQRRef.current = null

      // Actualizar estado inmediatamente basado en la respuesta
      if (data.qr && typeof data.qr === 'string' && data.qr.length > 20) {
        console.log(`[WhatsApp Simple] 📱 QR disponible después de desconectar`)
        setState('pending')
        setSessionData(data)
        lastPhaseRef.current = 'has_qr'
        retryCountRef.current = 0
      } else if (data.status === 'STARTING' || data.status === 'SCAN_QR') {
        console.log(`[WhatsApp Simple] ⏳ Esperando QR después de desconectar`)
        setState('pending')
        setSessionData(data)
        lastPhaseRef.current = 'waiting'
        retryCountRef.current = 0
      } else {
        console.log(`[WhatsApp Simple] 🔄 Estado desconocido, iniciando polling`)
        setState('loading')
        setSessionData(null)
      }
      
      // Iniciar polling para mantener actualizado
      startPolling()
      
      // Mostrar banner después de 3 segundos si el estado no cambió correctamente
      setTimeout(() => {
        console.log(`[WhatsApp Simple] 🔄 Verificando si mostrar banner... Acción: ${actionPerformed}, Estado: ${state}`)
        // Si hicimos logout pero seguimos en connected, o si no cambió a pending
        if (actionPerformed === 'disconnect' && state === 'connected') {
          console.log(`[WhatsApp Simple] ⚠️ Desconexión no reflejada, mostrando banner`)
          setShowRefreshBanner(true)
          setActionPerformed(null)
        }
      }, 3000)
      
      // Forzar verificación inmediata después de 1 segundo para actualizar UI
      setTimeout(() => {
        console.log(`[WhatsApp Simple] 🔄 Verificación forzada después de desconectar`)
        checkStatus()
      }, 1000)

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error desconectando:`, error)
      setErrorMessage(error.message)
      setState('error')
    } finally {
      setIsLoading(false)
    }
  }, [startPolling, checkStatus])

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

      // Marcar que realizamos una acción de cambio de número
      setActionPerformed('change_number')
      
      // ✅ Limpiar QR guardado al cambiar número (necesitamos uno nuevo)
      savedQRRef.current = null

      // Actualizar estado inmediatamente basado en la respuesta
      if (data.qr && typeof data.qr === 'string' && data.qr.length > 20) {
        console.log(`[WhatsApp Simple] 📱 QR disponible después de cambiar número`)
        setState('pending')
        setSessionData(data)
        lastPhaseRef.current = 'has_qr'
        retryCountRef.current = 0
      } else if (data.status === 'STARTING' || data.status === 'SCAN_QR') {
        console.log(`[WhatsApp Simple] ⏳ Esperando QR después de cambiar número`)
        setState('pending')
        setSessionData(data)
        lastPhaseRef.current = 'waiting'
        retryCountRef.current = 0
      } else {
        console.log(`[WhatsApp Simple] 🔄 Estado desconocido, iniciando polling`)
        setState('loading')
        setSessionData(null)
      }
      
      // Iniciar polling para mantener actualizado
      startPolling()
      
      // Mostrar banner después de 3 segundos si el estado no cambió correctamente
      setTimeout(() => {
        console.log(`[WhatsApp Simple] 🔄 Verificando si mostrar banner... Acción: ${actionPerformed}, Estado: ${state}`)
        // Si cambiamos número pero seguimos en connected con el número viejo
        if (actionPerformed === 'change_number' && state === 'connected') {
          console.log(`[WhatsApp Simple] ⚠️ Cambio de número no reflejado, mostrando banner`)
          setShowRefreshBanner(true)
          setActionPerformed(null)
        }
      }, 3000)
      
      // Forzar verificación inmediata después de 1 segundo para actualizar UI
      setTimeout(() => {
        console.log(`[WhatsApp Simple] 🔄 Verificación forzada después de cambiar número`)
        checkStatus()
      }, 1000)

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error cambiando número:`, error)
      setErrorMessage(error.message)
      setState('error')
    } finally {
      setIsLoading(false)
    }
  }, [startPolling, checkStatus])

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
        {/* ✅ MEJORA: Banner más prominente con auto-refresh y countdown */}
        {showRefreshBanner && (
          <div className={cn(
            'p-6 rounded-xl border-2 animate-in fade-in slide-in-from-top-4 duration-700 shadow-lg',
            darkMode 
              ? 'bg-gradient-to-br from-green-500/20 via-cyan-500/15 to-blue-500/20 border-green-500/40' 
              : 'bg-gradient-to-br from-green-50 via-cyan-50 to-blue-50 border-green-400'
          )}>
            <div className="flex flex-col items-center text-center gap-4">
              {/* Icono animado */}
              <div className={cn(
                'p-3 rounded-full animate-pulse',
                darkMode ? 'bg-green-500/30' : 'bg-green-200'
              )}>
                <CheckCircle2 className={cn(
                  'w-8 h-8',
                  darkMode ? 'text-green-400' : 'text-green-600'
                )} />
              </div>
              
              <div className="space-y-2">
                <p className={cn(
                  'font-bold text-xl mb-1',
                  darkMode ? 'text-green-400' : 'text-green-700'
                )}>
                  ¡WhatsApp vinculado exitosamente! 🎉
                </p>
                <p className={cn(
                  'text-sm font-medium',
                  darkMode ? 'text-slate-200' : 'text-gray-700'
                )}>
                  Tu número está conectado y listo para usar
                </p>
                
                {/* Countdown visible y prominente */}
                {autoRefreshCountdown !== null && autoRefreshCountdown > 0 ? (
                  <div className={cn(
                    'mt-3 p-3 rounded-lg border',
                    darkMode ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-gray-200'
                  )}>
                    <p className={cn(
                      'text-xs font-medium mb-1',
                      darkMode ? 'text-slate-400' : 'text-gray-600'
                    )}>
                      Actualizando automáticamente en:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className={cn(
                        'w-4 h-4 animate-spin',
                        darkMode ? 'text-cyan-400' : 'text-cyan-600'
                      )} />
                      <span className={cn(
                        'text-2xl font-bold tabular-nums',
                        darkMode ? 'text-cyan-400' : 'text-cyan-600'
                      )}>
                        {autoRefreshCountdown}s
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              
              <div className="flex gap-3 w-full">
                <Button
                  size="lg"
                  onClick={() => {
                    clearAutoRefreshTimers()
                    setShowRefreshBanner(false)
                    setActionPerformed(null)
                    // Actualizar estado sin recargar la página
                    checkStatus()
                  }}
                  className={cn(
                    'flex-1 font-semibold',
                    darkMode 
                      ? 'bg-green-600 hover:bg-green-500 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar estado
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    clearAutoRefreshTimers()
                    setShowRefreshBanner(false)
                    setActionPerformed(null)
                  }}
                  className={cn(
                    'font-semibold',
                    darkMode && 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  )}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}

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
                <div className={cn(
                  'p-4 rounded-lg border',
                  darkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'
                )}>
                  <p className={cn('text-sm text-center font-medium mb-1', darkMode ? 'text-cyan-400' : 'text-cyan-700')}>
                    📱 Escanea este código QR con WhatsApp
                  </p>
                  <p className={cn('text-xs text-center', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                    1. Abre WhatsApp en tu teléfono<br/>
                    2. Ve a Configuración {'>'} Dispositivos vinculados<br/>
                    3. Toca "Vincular un dispositivo" y escanea
                  </p>
                  <p className={cn('text-xs text-center mt-2 font-medium', darkMode ? 'text-green-400' : 'text-green-600')}>
                    ✨ La conexión se detectará automáticamente
                  </p>
                </div>
              </>
            ) : (
              <div className={cn(
                'p-6 rounded-lg border flex flex-col items-center gap-4',
                darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'
              )}>
                <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
                <div className="text-center space-y-2">
                  <p className={cn('text-sm font-medium', darkMode ? 'text-slate-300' : 'text-gray-700')}>
                    {sessionData?.message || 'Generando código QR...'}
                  </p>
                  <p className={cn('text-xs', darkMode ? 'text-slate-500' : 'text-gray-500')}>
                    Esto puede tomar unos segundos
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NO CONECTADO / ERROR / PENDIENTE SIN QR (esperando que presione botón) */}
        {(state === 'loading' || state === 'error' || (state === 'pending' && !sessionData?.qr)) && (
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


