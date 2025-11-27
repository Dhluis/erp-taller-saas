"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, Save } from 'lucide-react'

export default function ConfigWAHAPage() {
  const [wahaUrl, setWahaUrl] = useState('https://waha-erp-eagles-sistem.0rfifc.easypanel.host')
  const [wahaKey, setWahaKey] = useState('mi_clave_segura_2025')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waha_api_url: wahaUrl.trim(),
          waha_api_key: wahaKey.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: '✅ Configuración guardada exitosamente. Ahora puedes recargar la página de WhatsApp.'
        })
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${data.error || 'Error desconocido'}`
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `❌ Error: ${error.message || 'Error al guardar configuración'}`
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de WAHA</CardTitle>
          <CardDescription>
            Guarda la configuración de WAHA en la base de datos. Esto permite que el sistema funcione
            incluso si las variables de entorno no están disponibles en Vercel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="waha-url">WAHA API URL</Label>
            <Input
              id="waha-url"
              type="url"
              value={wahaUrl}
              onChange={(e) => setWahaUrl(e.target.value)}
              placeholder="https://waha-erp-eagles-sistem.0rfifc.easypanel.host"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waha-key">WAHA API Key</Label>
            <Input
              id="waha-key"
              type="password"
              value={wahaKey}
              onChange={(e) => setWahaKey(e.target.value)}
              placeholder="mi_clave_segura_2025"
            />
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>{result.message}</span>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSave}
            disabled={loading || !wahaUrl.trim() || !wahaKey.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </Button>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Nota:</strong> Esta configuración se guarda en la base de datos y tiene prioridad más baja que las variables de entorno.</p>
            <p>Si las variables de entorno están disponibles, se usarán primero. Si no, se usará esta configuración.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

