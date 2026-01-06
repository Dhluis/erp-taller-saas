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

// Intervalos optimizados según estado y dispositivo
const POLLING_INTERVAL_NO_QR_MOBILE = 10000 // 10 segundos cuando NO tiene QR en mobile
const POLLING_INTERVAL_NO_QR_DESKTOP = 5000 // 5 segundos cuando NO tiene QR en desktop
const POLLING_INTERVAL_WITH_QR = 3000 // 3 segundos cuando YA tiene QR visible (optimizado para detectar conexión rápido)
const POLLING_INTERVAL_QR_SCANNED = 2000 // 2 segundos cuando QR fue escaneado (polling agresivo)
const POLLING_INTERVAL_CONNECTED = 60000 // 60 segundos cuando está conectado
const MAX_RETRIES = 20 // Máximo de reintentos esperando QR
const QR_SCANNED_TIMEOUT = 30000 // 30 segundos máximo de polling agresivo después de escanear QR

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
  const userInitiatedConnectRef = useRef(false) // ✅ Ref para rastrear si el usuario presionó "Vincular WhatsApp" (evita problemas de closure con estado)
  const isMobileRef = useRef(false) // ✅ Detección de dispositivo mobile
  const isPageVisibleRef = useRef(true) // ✅ Rastrear si la página está visible
  const currentStateRef = useRef<'loading' | 'connected' | 'pending' | 'error'>('loading') // ✅ Ref para estado actual (para uso en handlers)
  const qrScannedRef = useRef(false) // ✅ Rastrear si el QR fue escaneado
  const qrScannedTimestampRef = useRef<number | null>(null) // ✅ Timestamp cuando se detectó QR escaneado
  const aggressivePollingTimeoutRef = useRef<NodeJS.Timeout | null>(null) // ✅ Timeout para polling agresivo
  const previousStatusRef = useRef<string | null>(null) // ✅ Rastrear status anterior para detectar cambios

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
    // Limpiar timeout de polling agresivo
    if (aggressivePollingTimeoutRef.current) {
      clearTimeout(aggressivePollingTimeoutRef.current)
      aggressivePollingTimeoutRef.current = null
    }
    retryCountRef.current = 0
    lastPhaseRef.current = null // Resetear fase también
    qrScannedRef.current = false // Resetear estado de QR escaneado
    qrScannedTimestampRef.current = null
  }, [])

  // ✅ Calcular intervalo según estado y dispositivo
  const getPollingInterval = useCallback((currentState: 'loading' | 'connected' | 'pending' | 'error', hasQR: boolean): number => {
    // Si está conectado: 60 segundos
    if (currentState === 'connected') {
      return POLLING_INTERVAL_CONNECTED
    }
    
    // Si QR fue escaneado: polling agresivo (2 segundos)
    if (qrScannedRef.current) {
      return POLLING_INTERVAL_QR_SCANNED
    }
    
    // Si tiene QR visible: 3 segundos (optimizado para detectar conexión rápido)
    if (hasQR) {
      return POLLING_INTERVAL_WITH_QR
    }
    
    // Si NO tiene QR: según dispositivo
    return isMobileRef.current ? POLLING_INTERVAL_NO_QR_MOBILE : POLLING_INTERVAL_NO_QR_DESKTOP
  }, [])

  // ✅ Función para iniciar polling agresivo temporal (cuando QR fue escaneado)
  const startAggressivePolling = useCallback((interval: number, maxDuration: number) => {
    // Limpiar timeout anterior si existe
    if (aggressivePollingTimeoutRef.current) {
      clearTimeout(aggressivePollingTimeoutRef.current)
    }
    
    console.log(`[WhatsApp Simple] 🔥 Iniciando polling agresivo: ${interval}ms por ${maxDuration}ms máximo`)
    
    // Detener polling normal
    stopPolling()
    
    // Iniciar polling agresivo
    const aggressiveCheck = () => {
      if (!isPageVisibleRef.current) {
        console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación agresiva`)
        return
      }
      
      // Verificar si ya pasó el timeout
      if (qrScannedTimestampRef.current) {
        const elapsed = Date.now() - qrScannedTimestampRef.current
        if (elapsed >= maxDuration) {
          console.log(`[WhatsApp Simple] ⏱️ Timeout de polling agresivo alcanzado (${maxDuration}ms), volviendo a polling normal`)
          qrScannedRef.current = false
          qrScannedTimestampRef.current = null
          stopPolling()
          // Reiniciar con polling normal para QR visible
          const normalInterval = POLLING_INTERVAL_WITH_QR
          const normalCheck = () => {
            if (!isPageVisibleRef.current) return
            if (previousStateRef.current === 'connected') {
              stopPolling()
              return
            }
            checkStatus()
          }
          pollingIntervalRef.current = setInterval(normalCheck, normalInterval)
          return
        }
      }
      
      if (previousStateRef.current === 'connected') {
        stopPolling()
        return
      }
      checkStatus()
    }
    
    pollingIntervalRef.current = setInterval(aggressiveCheck, interval)
    
    // Timeout para volver a polling normal después de maxDuration
    aggressivePollingTimeoutRef.current = setTimeout(() => {
      console.log(`[WhatsApp Simple] ⏱️ Timeout de polling agresivo alcanzado, volviendo a polling normal`)
      qrScannedRef.current = false
      qrScannedTimestampRef.current = null
      stopPolling()
      
      // Reiniciar con polling normal para QR visible
      const normalInterval = POLLING_INTERVAL_WITH_QR
      const normalCheck = () => {
        if (!isPageVisibleRef.current) return
        if (previousStateRef.current === 'connected') {
          stopPolling()
          return
        }
        checkStatus()
      }
      pollingIntervalRef.current = setInterval(normalCheck, normalInterval)
    }, maxDuration)
  }, [stopPolling])

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
      const currentStatus = data.status || 'UNKNOWN'
      const previousStatus = previousStatusRef.current
      
      console.log(`[WhatsApp Simple] 📦 Respuesta:`, data)
      console.log(`[WhatsApp Simple] 📱 Estado detectado:`, currentStatus)
      console.log(`[WhatsApp Simple] 🔄 Cambio de estado:`, previousStatus, '→', currentStatus)
      
      // ✅ DETECTAR cuando QR fue escaneado
      // Detectar cambio de estado que indica que el QR fue escaneado
      const qrWasScanned = (
        // Estado cambió de SCAN_QR/STARTING a algo diferente (pero no WORKING aún)
        (previousStatus === 'SCAN_QR' || previousStatus === 'SCAN_QR_CODE' || previousStatus === 'STARTING') &&
        currentStatus !== 'SCAN_QR' && 
        currentStatus !== 'SCAN_QR_CODE' && 
        currentStatus !== 'STARTING' &&
        currentStatus !== 'WORKING' &&
        !data.connected
      ) || (
        // O si el backend reporta un estado intermedio
        currentStatus === 'qr_scanned' || 
        currentStatus === 'connecting' ||
        (data.message && data.message.toLowerCase().includes('escaneado'))
      )
      
      if (qrWasScanned && !qrScannedRef.current) {
        console.log(`[WhatsApp Simple] ✅ QR ESCANEADO DETECTADO! Activando polling agresivo...`)
        qrScannedRef.current = true
        qrScannedTimestampRef.current = Date.now()
        startAggressivePolling(POLLING_INTERVAL_QR_SCANNED, QR_SCANNED_TIMEOUT)
      }
      
      // Actualizar status anterior
      previousStatusRef.current = currentStatus

      // CONECTADO
      if (data.connected || data.status === 'WORKING') {
        console.log(`[WhatsApp Simple] ✅ Conectado: ${data.phone || 'N/A'}`)
        
        // ✅ Limpiar estado de QR escaneado cuando se conecta
        if (qrScannedRef.current) {
          console.log(`[WhatsApp Simple] 🎉 Conexión exitosa después de escanear QR!`)
          qrScannedRef.current = false
          qrScannedTimestampRef.current = null
          if (aggressivePollingTimeoutRef.current) {
            clearTimeout(aggressivePollingTimeoutRef.current)
            aggressivePollingTimeoutRef.current = null
          }
        }
        
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
          if (userInitiatedConnectRef.current) {
            console.log(`[WhatsApp Simple] 📱 Acabamos de vincular, estado actualizado sin recargar`)
            userInitiatedConnectRef.current = false
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
        
        // ✅ Detener polling agresivo y volver a polling normal de mantenimiento
        stopPolling()
        
        // ✅ Iniciar polling con intervalo optimizado para estado conectado
        // Solo si no hay polling activo o si el intervalo necesita actualizarse
        if (!pollingIntervalRef.current) {
          const interval = getPollingInterval('connected', false)
          console.log(`[WhatsApp Simple] ▶️ Iniciando polling de mantenimiento (conectado, ${interval}ms)`)
          
          const connectedPollingCheck = () => {
            // Solo verificar si la página está visible
            if (!isPageVisibleRef.current) {
              console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación`)
              return
            }
            checkStatus()
          }
          
          pollingIntervalRef.current = setInterval(connectedPollingCheck, interval)
        }
        
        return
      }

      // TIENE QR - solo mostrar si el usuario presionó "Vincular WhatsApp"
      // ✅ IMPORTANTE: No mostrar QR automáticamente - solo si userInitiatedConnectRef.current === true
      const qr = data.qr
      // ✅ Si no hay QR en la respuesta pero tenemos uno guardado, usar el guardado
      const effectiveQR = (qr && typeof qr === 'string' && qr.length > 20) ? qr : savedQRRef.current
      
      // ✅ Solo mostrar QR si el usuario inició la acción de conectar
      if (effectiveQR && typeof effectiveQR === 'string' && effectiveQR.length > 20 && userInitiatedConnectRef.current) {
        // ✅ Guardar QR si es nuevo o diferente
        const isNewQR = !savedQRRef.current || savedQRRef.current !== effectiveQR
        if (isNewQR) {
          savedQRRef.current = effectiveQR
          console.log(`[WhatsApp Simple] 💾 QR guardado: ${effectiveQR.length} caracteres`)
        }
        
        // Si cambiamos de fase "esperando" a "tiene QR", resetear contador y DETENER polling agresivo
        if (lastPhaseRef.current !== 'has_qr') {
          console.log(`[WhatsApp Simple] 🔄 Cambio de fase: esperando → tiene QR (deteniendo polling agresivo)`)
          retryCountRef.current = 0
          lastPhaseRef.current = 'has_qr'
          
          // ✅ DETENER polling agresivo cuando recibimos QR por primera vez
          // Solo mantener polling lento para detectar conexión
          stopPolling()
          
          // Reiniciar polling con intervalo optimizado (solo para detectar conexión)
          // Usar función wrapper para evitar problemas de closure
          const slowPollingCheck = () => {
            // Solo verificar si la página está visible
            if (!isPageVisibleRef.current) {
              console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación`)
              return
            }
            
            if (previousStateRef.current === 'connected') {
              stopPolling()
              return
            }
            checkStatus()
          }
          
          const interval = getPollingInterval('pending', true)
          console.log(`[WhatsApp Simple] ⏱️ Polling interval actual: ${interval}ms`)
          pollingIntervalRef.current = setInterval(slowPollingCheck, interval)
          console.log(`[WhatsApp Simple] ✅ Polling optimizado iniciado (${interval}ms) para detectar conexión con QR visible`)
        }
        
        // Marcar que estamos esperando conexión (para mostrar banner cuando se conecte)
        if (actionPerformed === null) {
          setActionPerformed('connect')
        }
        
        // NO incrementar contador cuando ya tenemos QR - el QR ya está visible
        // Solo incrementar si es un QR nuevo
        if (isNewQR) {
          retryCountRef.current += 1
          console.log(`[WhatsApp Simple] 📱 QR recibido: ${effectiveQR.length} caracteres (nuevo QR)`)
        } else {
          // QR ya estaba guardado, solo verificar conexión
          console.log(`[WhatsApp Simple] 📱 QR ya visible, verificando conexión...`)
        }
        
        const wasNotPending = previousStateRef.current !== 'pending'
        setState('pending')
        previousStateRef.current = 'pending'
        // ✅ Usar el QR efectivo (puede ser el guardado) en sessionData
        setSessionData({ ...data, qr: effectiveQR })
        setErrorMessage(null)
        if (wasNotPending) {
        onStatusChange?.('pending')
        }
        
        // Verificar directamente en WAHA si ya se conectó (cada verificación cuando tenemos QR)
        // (útil cuando el webhook no llega pero la conexión sí funciona)
        try {
          const checkResponse = await fetch('/api/whatsapp/check-connection', {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store'
          })
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            
            if (checkData.connected) {
              console.log(`[WhatsApp Simple] ✅ ¡Conectado en WAHA! (detectado durante verificación de QR)`)
              const wasNotConnected = previousStateRef.current !== 'connected'
              const phoneChanged = sessionData?.phone !== checkData.phone
              const isNewConnection = wasNotConnected && checkData.phone && lastConnectionEventRef.current !== checkData.phone
              
              // Solo actualizar estado si realmente cambió
              if (wasNotConnected || phoneChanged) {
                console.log(`[WhatsApp Simple] 🔄 Actualizando estado a conectado (detectado durante verificación)`)
                stopPolling() // Detener polling cuando se conecta
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
                  console.log(`[WhatsApp Simple] 🔔 Disparando evento de conexión (nueva conexión)`)
                  lastConnectionEventRef.current = checkData.phone
                  window.dispatchEvent(new CustomEvent('whatsapp:connected', {
                    detail: { phone: checkData.phone, name: checkData.name }
                  }))
                }
                
                // Limpiar acción si acabamos de vincular
                if (userInitiatedConnectRef.current) {
                  console.log(`[WhatsApp Simple] 📱 Acabamos de vincular, estado actualizado`)
                  userInitiatedConnectRef.current = false
                  setActionPerformed(null)
                }
              }
              
              return
            }
          }
        } catch (checkError) {
          console.warn(`[WhatsApp Simple] ⚠️ Error verificando en WAHA:`, checkError)
        }
        
        // QR visible - no hacer más polling agresivo, solo esperar conexión
        return
      }

      // ESPERANDO QR
      // ✅ IMPORTANTE: No cambiar a "esperando QR" si ya estamos conectados
      // Esto previene que el estado cambie de vuelta después de conectarse
      if (state === 'connected') {
        console.log(`[WhatsApp Simple] ⚠️ Ya conectado, ignorando cambio a "esperando QR"`)
        return
      }
      
      // ✅ IMPORTANTE: Si tenemos un QR guardado Y el usuario presionó el botón, mantenerlo
      // El backend puede no retornar el QR temporalmente, pero el QR sigue siendo válido
      if (savedQRRef.current && lastPhaseRef.current === 'has_qr' && userInitiatedConnectRef.current) {
        console.log(`[WhatsApp Simple] ⚠️ QR guardado disponible, manteniendo estado "tiene QR" aunque backend no lo retorne`)
        // Usar el QR guardado y mantener el estado
        setSessionData({ ...data, qr: savedQRRef.current })
        setState('pending') // Asegurar que estamos en estado pending para mostrar el QR
        return
      }
      
      // ✅ Si el usuario NO presionó el botón, NO hacer nada (mostrar botón "Vincular WhatsApp")
      if (!userInitiatedConnectRef.current) {
        console.log(`[WhatsApp Simple] ⚠️ Backend devuelve estado ${data.status} sin QR, pero usuario no presionó botón. Mostrando botón.`)
        setState('loading') // Volver a estado loading para mostrar el botón
        setSessionData(null)
        stopPolling() // Detener polling - esperar a que el usuario presione el botón
        return
      }
      
      // ✅ Solo cambiar a "esperando QR" si el usuario presionó el botón y realmente no tenemos QR guardado
      // Si cambiamos de fase "tiene QR" a "esperando", resetear contador
      if (lastPhaseRef.current !== 'waiting') {
        console.log(`[WhatsApp Simple] 🔄 Cambio de fase: tiene QR → esperando (resetear contador)`)
        retryCountRef.current = 0
        lastPhaseRef.current = 'waiting'
        // NO limpiar savedQRRef aquí - puede ser temporal que el backend no lo retorne
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
    
    // ✅ Calcular intervalo según estado actual y si tenemos QR
    const hasQR = !!savedQRRef.current
    const interval = getPollingInterval(state, hasQR)
    const deviceType = isMobileRef.current ? 'mobile' : 'desktop'
    console.log(`[WhatsApp Simple] ▶️ Iniciando polling (${interval}ms, ${deviceType}${hasQR ? ' - con QR guardado' : ' - esperando QR'})`)
    
    // Primera verificación inmediata
    checkStatus()
    
    // Polling con intervalo optimizado según estado y dispositivo
    const pollingCheck = () => {
      // Solo verificar si la página está visible
      if (!isPageVisibleRef.current) {
        console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación`)
        return
      }
      checkStatus()
    }
    
    pollingIntervalRef.current = setInterval(pollingCheck, interval)
  }, [checkStatus, stopPolling, state, getPollingInterval])

  // ✅ Sincronizar ref del estado con el estado actual
  useEffect(() => {
    currentStateRef.current = state
  }, [state])

  // ✅ Detectar dispositivo mobile y manejar visibilidad de página
  useEffect(() => {
    // Detectar si es mobile
    if (typeof window !== 'undefined') {
      isMobileRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      console.log(`[WhatsApp Simple] 📱 Dispositivo detectado: ${isMobileRef.current ? 'Mobile' : 'Desktop'}`)
      
      // ✅ Manejar visibilidad de página (pausar polling cuando está en background)
      const handleVisibilityChange = () => {
        const isVisible = !document.hidden
        isPageVisibleRef.current = isVisible
        
        if (isVisible) {
          console.log(`[WhatsApp Simple] 👁️ Página visible, reanudando polling si es necesario`)
          // Si hay polling activo, ya se reanudará automáticamente en la próxima verificación
          // Si no hay polling pero debería haberlo (conectado o con QR), reiniciarlo
          // Usar ref para acceder al estado actual sin problemas de closure
          const currentState = currentStateRef.current
          if (currentState === 'connected' || (currentState === 'pending' && savedQRRef.current)) {
            if (!pollingIntervalRef.current) {
              // Reiniciar polling con el intervalo correcto según el estado
              const hasQR = !!savedQRRef.current
              const interval = getPollingInterval(currentState, hasQR)
              console.log(`[WhatsApp Simple] ▶️ Reiniciando polling después de volver a visible (${interval}ms)`)
              
              const pollingCheck = () => {
                if (!isPageVisibleRef.current) {
                  return
                }
                checkStatus()
              }
              
              pollingIntervalRef.current = setInterval(pollingCheck, interval)
            }
          }
        } else {
          console.log(`[WhatsApp Simple] 👁️ Página en background, polling pausado (se reanudará al volver)`)
          // NO detener el intervalo, solo omitir las verificaciones
          // Esto permite que se reanude automáticamente cuando vuelva a estar visible
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar - el handler usa refs para acceder a valores actuales

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
            
            // Iniciar polling optimizado para mantener estado actualizado cuando está conectado
            const initTimeout = setTimeout(() => {
              const interval = getPollingInterval('connected', false)
              console.log(`[WhatsApp Simple] ▶️ Iniciando polling de mantenimiento (conectado, ${interval}ms)`)
              
              const connectedPollingCheck = () => {
                if (!isPageVisibleRef.current) {
                  console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación`)
                  return
                }
                checkStatus()
              }
              
              pollingIntervalRef.current = setInterval(connectedPollingCheck, interval)
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
      // ✅ IMPORTANTE: Marcar que el usuario inició la acción de conectar (usar ref para evitar problemas de closure)
      userInitiatedConnectRef.current = true
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

      // ✅ Si la respuesta ya incluye un QR, mostrarlo inmediatamente y DETENER polling agresivo
      if (data.qr && typeof data.qr === 'string' && data.qr.length > 20) {
        console.log(`[WhatsApp Simple] 📱 QR recibido inmediatamente: ${data.qr.length} caracteres`)
        savedQRRef.current = data.qr
        setState('pending')
        setSessionData(data)
        previousStateRef.current = 'pending'
        lastPhaseRef.current = 'has_qr'
        retryCountRef.current = 0
        
        // ✅ DETENER polling agresivo inmediatamente cuando recibimos QR
        stopPolling()
        
        // ✅ Iniciar polling optimizado solo para detectar conexión (no para obtener QR)
        // Usar función wrapper para evitar problemas de closure
        const slowPollingCheck = () => {
          // Solo verificar si la página está visible
          if (!isPageVisibleRef.current) {
            console.log(`[WhatsApp Simple] ⏸️ Página en background, omitiendo verificación`)
            return
          }
          
          if (previousStateRef.current === 'connected') {
            stopPolling()
            return
          }
          checkStatus()
        }
        
        const interval = getPollingInterval('pending', true)
        console.log(`[WhatsApp Simple] ⏱️ Polling interval actual: ${interval}ms`)
        pollingIntervalRef.current = setInterval(slowPollingCheck, interval)
        console.log(`[WhatsApp Simple] ✅ QR visible, polling optimizado iniciado (${interval}ms) para detectar conexión`)
        return // ✅ NO iniciar polling agresivo - el QR ya está visible
      }

      // ✅ Solo iniciar polling agresivo si NO recibimos QR en la respuesta inicial
      console.log(`[WhatsApp Simple] ⏳ QR no recibido inmediatamente, iniciando polling agresivo para obtenerlo`)
      startPolling()

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error generando QR:`, error)
      setErrorMessage(error.message)
      setState('error')
      userInitiatedConnectRef.current = false // Limpiar ref si hay error
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
      // ✅ Detener polling antes de desconectar para evitar race conditions
      stopPolling()
      
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
      console.log(`[WhatsApp Simple] 📥 Respuesta de logout:`, data)

      // ✅ Verificar que la respuesta sea exitosa
      if (!data.success) {
        throw new Error(data.error || 'Error al desconectar')
      }

      console.log(`[WhatsApp Simple] ✅ Desconectado exitosamente`)

      // ✅ Limpiar refs y estado inmediatamente
      userInitiatedConnectRef.current = false
      savedQRRef.current = null
      lastPhaseRef.current = null
      retryCountRef.current = 0
      previousStateRef.current = null
      lastConnectionEventRef.current = null
      qrScannedRef.current = false
      qrScannedTimestampRef.current = null
      previousStatusRef.current = null
      
      // ✅ Limpiar acción después de desconectar
      setActionPerformed(null)

      // ✅ Después de desconectar, siempre volver a estado inicial (loading) para mostrar botón
      // NO iniciar polling automáticamente - esperar a que el usuario presione "Vincular WhatsApp"
      console.log(`[WhatsApp Simple] 🔄 Desconexión completada, volviendo a estado inicial`)
      setState('loading')
      setSessionData(null)
      setErrorMessage(null)
      onStatusChange?.('loading')

    } catch (error: any) {
      console.error(`[WhatsApp Simple] ❌ Error desconectando:`, error)
      setErrorMessage(error.message)
      setState('error')
      onStatusChange?.('error')
    } finally {
      setIsLoading(false)
    }
  }, [stopPolling, onStatusChange])

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
      
      // ✅ Limpiar ref de conexión iniciada por usuario
      userInitiatedConnectRef.current = false
      
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
                {/* ✅ Estado intermedio cuando QR fue escaneado */}
                {qrScannedRef.current ? (
                  <div className={cn(
                    'p-4 rounded-lg border',
                    darkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
                  )}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Loader2 className={cn('w-4 h-4 animate-spin', darkMode ? 'text-green-400' : 'text-green-600')} />
                      <p className={cn('text-sm text-center font-medium', darkMode ? 'text-green-400' : 'text-green-700')}>
                        ✅ QR escaneado, conectando...
                      </p>
                    </div>
                    <p className={cn('text-xs text-center', darkMode ? 'text-slate-400' : 'text-gray-600')}>
                      Estableciendo conexión con WhatsApp. Esto puede tomar unos segundos.
                    </p>
                  </div>
                ) : (
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
                )}
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


