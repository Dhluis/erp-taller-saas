'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Server, Cloud, Loader2, CheckCircle2, Wifi, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppSetupStepProps {
  data: {
    waha_config_type?: 'shared' | 'custom'
    waha_api_url?: string
    waha_api_key?: string
  }
  onChange: (data: { waha_config_type: 'shared' | 'custom', waha_api_url?: string, waha_api_key?: string }) => void
}

export function WhatsAppSetupStep({ data, onChange }: WhatsAppSetupStepProps) {
  const [wahaConfigType, setWahaConfigType] = useState<'shared' | 'custom'>(data.waha_config_type || 'shared')
  const [wahaApiUrl, setWahaApiUrl] = useState(data.waha_api_url || '')
  const [wahaApiKey, setWahaApiKey] = useState(data.waha_api_key || '')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string>('')

  const handleConfigTypeChange = (value: 'shared' | 'custom') => {
    setWahaConfigType(value)
    if (value === 'shared') {
      // Limpiar campos personalizados al cambiar a compartido
      setWahaApiUrl('')
      setWahaApiKey('')
      setTestStatus('idle')
      setTestError('')
      onChange({ waha_config_type: 'shared' })
    } else {
      onChange({ waha_config_type: 'custom', waha_api_url: wahaApiUrl, waha_api_key: wahaApiKey })
    }
  }

  const handleUrlChange = (value: string) => {
    setWahaApiUrl(value)
    setTestStatus('idle')
    setTestError('')
    onChange({ waha_config_type: 'custom', waha_api_url: value, waha_api_key: wahaApiKey })
  }

  const handleKeyChange = (value: string) => {
    setWahaApiKey(value)
    setTestStatus('idle')
    setTestError('')
    onChange({ waha_config_type: 'custom', waha_api_url: wahaApiUrl, waha_api_key: value })
  }

  const validateUrl = (url: string): boolean => {
    if (!url) return false
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const testWAHAConnection = async () => {
    if (!wahaApiUrl || !wahaApiKey) {
      toast.error('Por favor, completa ambos campos antes de probar la conexión')
      return
    }

    if (!validateUrl(wahaApiUrl)) {
      toast.error('La URL debe comenzar con https://')
      setTestError('La URL debe usar HTTPS')
      return
    }

    setTestStatus('testing')
    setTestError('')

    try {
      const response = await fetch(`${wahaApiUrl}/sessions`, {
        method: 'GET',
        headers: {
          'X-Api-Key': wahaApiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setTestStatus('success')
        toast.success('Conexión exitosa con el servidor WAHA')
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        setTestStatus('error')
        const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`
        setTestError(errorMessage)
        toast.error(`Error de conexión: ${errorMessage}`)
      }
    } catch (error) {
      setTestStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Error al conectar con el servidor'
      setTestError(errorMessage)
      toast.error(`Error de conexión: ${errorMessage}`)
    }
  }

  const canContinue = wahaConfigType === 'shared' || (wahaConfigType === 'custom' && wahaApiUrl && wahaApiKey && validateUrl(wahaApiUrl))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Conecta tu WhatsApp Business
        </CardTitle>
        <CardDescription>
          Elige cómo quieres conectar tu WhatsApp. Puedes usar nuestro servidor compartido o tu propia instancia de WAHA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={wahaConfigType} onValueChange={handleConfigTypeChange}>
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="shared" id="shared" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="shared" className="text-base font-semibold cursor-pointer">
                  Servidor Compartido
                </Label>
                <Badge variant="default" className="bg-green-500">
                  Recomendado
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Usa nuestro servidor WAHA compartido. Incluido sin costo adicional.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="w-4 h-4" />
                <span>Servidor administrado por Eagles ERP</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="custom" className="text-base font-semibold cursor-pointer">
                  Servidor Personalizado
                </Label>
                <Badge variant="outline">
                  Enterprise
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Conecta tu propia instancia de WAHA para mayor control y personalización.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cloud className="w-4 h-4" />
                <span>Requiere servidor WAHA propio</span>
              </div>
            </div>
          </div>
        </RadioGroup>

        {wahaConfigType === 'custom' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="waha_api_url">
                URL del Servidor WAHA <span className="text-destructive">*</span>
              </Label>
              <Input
                id="waha_api_url"
                type="url"
                placeholder="https://tu-waha.ejemplo.com/api"
                value={wahaApiUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={!wahaApiUrl || validateUrl(wahaApiUrl) ? '' : 'border-destructive'}
              />
              {wahaApiUrl && !validateUrl(wahaApiUrl) && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  La URL debe comenzar con https://
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Ingresa la URL completa de tu servidor WAHA, incluyendo /api al final
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waha_api_key">
                API Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="waha_api_key"
                type="password"
                placeholder="tu-api-key"
                value={wahaApiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Obtén tu API Key desde el panel de administración de tu servidor WAHA
              </p>
            </div>

            {wahaApiUrl && wahaApiKey && (
              <div className="space-y-2">
                <Button
                  onClick={testWAHAConnection}
                  disabled={testStatus === 'testing' || !validateUrl(wahaApiUrl)}
                  variant="outline"
                  className="w-full"
                >
                  {testStatus === 'testing' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Probando conexión...
                    </>
                  )}
                  {testStatus === 'success' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      Conexión exitosa
                    </>
                  )}
                  {testStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                      Error de conexión
                    </>
                  )}
                  {testStatus === 'idle' && (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Probar conexión
                    </>
                  )}
                </Button>

                {testStatus === 'error' && testError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{testError}</AlertDescription>
                  </Alert>
                )}

                {testStatus === 'success' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Conexión verificada exitosamente. Puedes continuar con el siguiente paso.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {wahaConfigType === 'shared' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Usarás nuestro servidor WAHA compartido. No necesitas configurar nada adicional.
            </AlertDescription>
          </Alert>
        )}

        {!canContinue && wahaConfigType === 'custom' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por favor, completa todos los campos requeridos y asegúrate de que la URL use HTTPS antes de continuar.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

