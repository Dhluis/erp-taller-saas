'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 4000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!mounted || (isOnline && !showReconnected)) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all duration-300',
        isOnline ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          Conexión restaurada — tus datos están guardados
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          Sin conexión — tus cambios se guardan automáticamente
        </>
      )}
    </div>
  )
}
