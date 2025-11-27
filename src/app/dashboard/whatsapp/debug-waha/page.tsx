"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database } from 'lucide-react'

export default function DebugWAHAPage() {
  const [loading, setLoading] = useState(true)
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkConfig = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Verificar endpoint de sesión
      const sessionResponse = await fetch('/api/whatsapp/session')
      const sessionData = await sessionResponse.json()

      // 2. Verificar configuración en BD (usando el endpoint de config)
      const configResponse = await fetch('/api/whatsapp/config')
      const configData = await configResponse.json()

      setDiagnostic({
        session: {
          status: sessionResponse.status,
          data: sessionData
        },
        config: {
          status: configResponse.status,
          data: configData
        },
        timestamp: new Date().toISOString()
      })
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConfig()
  }, [])

  const hasWAHAConfig = diagnostic?.config?.data?.policies?.waha_api_url || 
                        diagnostic?.config?.data?.policies?.WAHA_API_URL

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Diagnóstico de Configuración WAHA
          </CardTitle>
          <CardDescription>
            Verifica el estado de la configuración de WAHA en la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={checkConfig} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar Diagnóstico
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {diagnostic && (
            <div className="space-y-4">
              {/* Estado de Configuración */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado de Configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    {hasWAHAConfig ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700">Configuración encontrada en BD</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-700">Configuración NO encontrada en BD</span>
                      </>
                    )}
                  </div>

                  {hasWAHAConfig && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-2">Valores encontrados:</p>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>
                          <strong>WAHA API URL:</strong>{' '}
                          {diagnostic.config.data.policies?.waha_api_url || 
                           diagnostic.config.data.policies?.WAHA_API_URL || 
                           'No encontrado'}
                        </li>
                        <li>
                          <strong>WAHA API Key:</strong>{' '}
                          {diagnostic.config.data.policies?.waha_api_key || 
                           diagnostic.config.data.policies?.WAHA_API_KEY ? 
                           '✅ Configurado' : '❌ No encontrado'}
                        </li>
                      </ul>
                    </div>
                  )}

                  {!hasWAHAConfig && (
                    <Alert>
                      <AlertDescription>
                        <p className="font-medium mb-2">No se encontró configuración de WAHA en la base de datos.</p>
                        <p className="text-sm">
                          Ve a{' '}
                          <a 
                            href="/dashboard/whatsapp/config-waha" 
                            className="text-blue-600 underline"
                          >
                            /dashboard/whatsapp/config-waha
                          </a>
                          {' '}para guardar la configuración.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Estado del Endpoint de Sesión */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado del Endpoint de Sesión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {diagnostic.session.status === 200 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="font-medium text-green-700">Endpoint funcionando</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="font-medium text-red-700">
                            Error {diagnostic.session.status}
                          </span>
                        </>
                      )}
                    </div>

                    {diagnostic.session.data.error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                          <p className="font-medium">{diagnostic.session.data.error}</p>
                          {diagnostic.session.data.hint && (
                            <p className="text-sm mt-2">{diagnostic.session.data.hint}</p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {diagnostic.session.data.success && (
                      <Alert className="mt-4">
                        <AlertDescription>
                          <p className="font-medium text-green-800">
                            ✅ Endpoint funcionando correctamente
                          </p>
                          {diagnostic.session.data.data?.status && (
                            <p className="text-sm mt-2">
                              Estado: <strong>{diagnostic.session.data.data.status}</strong>
                            </p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Datos Raw (para debugging) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Ver datos raw (debugging)
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(diagnostic, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

