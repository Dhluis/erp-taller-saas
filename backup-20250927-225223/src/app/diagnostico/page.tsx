"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { getBrowserClient, testConnection, getSupabaseInfo } from '@/lib/supabase/client-robust'
import { browserOperations } from '@/lib/supabase/operations'
import { useErrorHandler } from '@/lib/utils/error-handler'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function DiagnosticoPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { error, setError, clearError, handleAsyncError } = useErrorHandler()

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    clearError()

    const newResults: DiagnosticResult[] = []

    // Test 1: Configuración de Supabase
    try {
      const info = getSupabaseInfo()
      newResults.push({
        test: "Configuración de Supabase",
        status: info.isConfigured ? 'success' : 'error',
        message: info.isConfigured 
          ? "Variables de entorno configuradas correctamente"
          : "Faltan variables de entorno. Revisa .env.local",
        details: info
      })
    } catch (error) {
      newResults.push({
        test: "Configuración de Supabase",
        status: 'error',
        message: `Error en configuración: ${error}`,
        details: error
      })
    }

    // Test 2: Conexión a Supabase
    try {
      const connectionResult = await testConnection()
      newResults.push({
        test: "Conexión a Supabase",
        status: connectionResult.success ? 'success' : 'error',
        message: connectionResult.success 
          ? `Conexión exitosa (${connectionResult.latency}ms)`
          : `Fallo en conexión: ${connectionResult.error}`,
        details: connectionResult
      })
    } catch (error) {
      newResults.push({
        test: "Conexión a Supabase",
        status: 'error',
        message: `Error probando conexión: ${error}`,
        details: error
      })
    }

    // Test 3: Cliente Supabase
    try {
      const client = getBrowserClient()
      if (client) {
        newResults.push({
          test: "Cliente Supabase",
          status: 'success',
          message: "Cliente Supabase inicializado correctamente",
        })
      } else {
        throw new Error("Cliente no inicializado")
      }
    } catch (error) {
      newResults.push({
        test: "Cliente Supabase",
        status: 'error',
        message: `Error inicializando cliente: ${error}`,
        details: error
      })
    }

    // Test 4: Operaciones de Supabase
    try {
      const { data, error: opError, success } = await browserOperations.select('invoices', '*', {}, {
        requireAuth: false,
        logQuery: true
      })

      newResults.push({
        test: "Operaciones de Supabase",
        status: success ? 'success' : 'error',
        message: success 
          ? `Operación exitosa. ${data?.length || 0} registros encontrados`
          : `Error en operación: ${opError}`,
        details: { success, error: opError, count: data?.length }
      })
    } catch (error) {
      newResults.push({
        test: "Operaciones de Supabase",
        status: 'error',
        message: `Error en operaciones: ${error}`,
        details: error
      })
    }

    // Test 5: Manejo de Errores
    try {
      const testError = new Error("Error de prueba")
      const result = await handleAsyncError(async () => {
        throw testError
      })

      newResults.push({
        test: "Manejo de Errores",
        status: result === null ? 'success' : 'error',
        message: result === null 
          ? "Manejo de errores funcionando correctamente"
          : "Error en manejo de errores",
        details: { result, error: error?.message }
      })
    } catch (error) {
      newResults.push({
        test: "Manejo de Errores",
        status: 'error',
        message: `Error probando manejo de errores: ${error}`,
        details: error
      })
    }

    setResults(newResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Éxito</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      case 'warning': return <Badge className="bg-yellow-500">Advertencia</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔧 Diagnóstico del Sistema</h1>
        <p className="text-muted-foreground">
          Verifica la configuración y funcionamiento de Supabase
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando diagnóstico...
              </>
            ) : (
              "Ejecutar Diagnóstico"
            )}
          </Button>

          {error && (
            <Card className="border-red-500 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Error General:</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados del Diagnóstico</h3>
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Ver detalles</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Instrucciones para solucionar problemas:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Verifica que las variables de entorno estén configuradas en <code>.env.local</code></li>
              <li>Asegúrate de que Supabase esté ejecutándose y sea accesible</li>
              <li>Verifica que las tablas existan en tu base de datos</li>
              <li>Revisa la consola del navegador para más detalles</li>
              <li>Si persisten los errores, ejecuta las migraciones SQL</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
