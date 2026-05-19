'use client'

import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline && !wasOffline) return null

  if (isOnline && wasOffline) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium animate-fadeIn">
        <Wifi className="h-4 w-4 flex-shrink-0" />
        <span>Conexión restaurada — sincronizando datos...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black text-sm font-medium">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>Sin conexión — puedes seguir navegando, los cambios se guardarán cuando vuelva el internet</span>
    </div>
  )
}
