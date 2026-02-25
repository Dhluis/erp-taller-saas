'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BellRing, BellOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function PushNotificationButton() {
  const [permission, setPermission] = useState<PermissionState>('unsupported')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as PermissionState)
  }, [])

  const subscribe = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      toast.error('Push no configurado', { description: 'Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY' })
      return
    }

    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON()),
      })

      const data = await res.json()
      if (data.success) {
        setPermission('granted')
        toast.success('Notificaciones activadas', {
          description: 'Recibirás alertas de órdenes de trabajo en este dispositivo',
        })
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error('Error al activar notificaciones', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setPermission('default')
      toast.success('Notificaciones desactivadas')
    } catch (err: any) {
      toast.error('Error', { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'unsupported') return null
  if (permission === 'denied') {
    return (
      <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
        <BellOff className="h-4 w-4 mr-2" />
        Notificaciones bloqueadas
      </Button>
    )
  }

  if (permission === 'granted') {
    return (
      <Button variant="ghost" size="sm" onClick={unsubscribe} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
        Notificaciones activas
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={subscribe} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
      Activar notificaciones
    </Button>
  )
}
