"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Database, Settings, Shield, Zap } from "lucide-react"
import { getClient, healthCheck, getClientInfo } from '@/lib/supabase/client'
import { getCollections, getCollectionStats } from '@/lib/supabase/collections-robust'
import { useErrorHandler } from '@/lib/utils/error-handler'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
  duration?: number
}

export default function DiagnosticoAvanzadoPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const { error, setError, clearError, handleAsyncError } = useErrorHandler()

  const runAdvancedDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    clearError()

    const newResults: DiagnosticResult[] = []

    // Test 1: Health Check del Sistema
    try {
      const startTime = Date.now()
      const health = await healthCheck()
      const duration = Date.now() - startTime
      
      setHealthStatus(health)
      
      newResults.push({
        test: "Health Check del Sistema",
        status: health.healthy ? 'success' : 'error',
        message: health.healthy 
          ? `Sistema saludable (${health.details.latency}ms)`
          : `Sistema no saludable: ${health.error}`,
        details: health.details,
        duration
      })
    } catch (error) {
      newResults.push({
        test: "Health Check del Sistema",
        status: 'error',
        message: `Error en health check: ${error}`,
        details: error
      })
    }

    // Test 2: Configuración del Cliente
    try {
      const clientInfo = getClientInfo()
      newResults.push({
        test: "Configuración del Cliente",
        status: clientInfo.config.isConfigured ? 'success' : 'error',
        message: clientInfo.config.isConfigured 
          ? "Cliente configurado correctamente"
          : "Cliente no configurado",
        details: clientInfo
      })
    } catch (error) {
      newResults.push({
        test: "Configuración del Cliente",
        status: 'error',
        message: `Error obteniendo información del cliente: ${error}`,
        details: error
      })
    }

    // Test 3: Conexión a Base de Datos
    try {
      const startTime = Date.now()
      const client = getClient()
      const { data, error: dbError } = await client
        .from('_test_connection')
        .select('*')
        .limit(1)
      
      const duration = Date.now() - startTime
      
      newResults.push({
        test: "Conexión a Base de Datos",
        status: !dbError || dbError.code === 'PGRST116' ? 'success' : 'error',
        message: !dbError || dbError.code === 'PGRST116'
          ? `Conexión exitosa (${duration}ms)`
          : `Error de conexión: ${dbError.message}`,
        details: { error: dbError, duration }
      })
    } catch (error) {
      newResults.push({
        test: "Conexión a Base de Datos",
        status: 'error',
        message: `Error probando conexión: ${error}`,
        details: error
      })
    }

    // Test 4: Verificar Tabla Collections
    try {
      const startTime = Date.now()
      const { data, error: tableError } = await getClient()
        .from('collections')
        .select('id')
        .limit(1)
      
      const duration = Date.now() - startTime
      
      newResults.push({
        test: "Verificar Tabla Collections",
        status: !tableError ? 'success' : 'error',
        message: !tableError
          ? `Tabla collections accesible (${duration}ms)`
          : `Error accediendo a tabla: ${tableError.message}`,
        details: { error: tableError, duration }
      })
    } catch (error) {
      newResults.push({
        test: "Verificar Tabla Collections",
        status: 'error',
        message: `Error verificando tabla: ${error}`,
        details: error
      })
    }

    // Test 5: Función getCollections
    try {
      const startTime = Date.now()
      const collections = await getCollections()
      const duration = Date.now() - startTime
      
      newResults.push({
        test: "Función getCollections",
        status: 'success',
        message: `getCollections ejecutada correctamente (${duration}ms) - ${collections.length} registros`,
        details: { count: collections.length, duration }
      })
    } catch (error) {
      newResults.push({
        test: "Función getCollections",
        status: 'error',
        message: `Error en getCollections: ${error}`,
        details: error
      })
    }

    // Test 6: Función getCollectionStats
    try {
      const startTime = Date.now()
      const stats = await getCollectionStats()
      const duration = Date.now() - startTime
      
      newResults.push({
        test: "Función getCollectionStats",
        status: 'success',
        message: `getCollectionStats ejecutada correctamente (${duration}ms)`,
        details: { stats, duration }
      })
    } catch (error) {
      newResults.push({
        test: "Función getCollectionStats",
        status: 'error',
        message: `Error en getCollectionStats: ${error}`,
        details: error
      })
    }

    // Test 7: Validar Políticas RLS
    try {
      const { data: policies, error: policiesError } = await getClient()
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'collections')
      
      newResults.push({
        test: "Políticas RLS",
        status: !policiesError ? 'success' : 'error',
        message: !policiesError
          ? `Políticas RLS configuradas (${policies?.length || 0} políticas)`
          : `Error verificando políticas: ${policiesError.message}`,
        details: { policies, error: policiesError }
      })
    } catch (error) {
      newResults.push({
        test: "Políticas RLS",
        status: 'error',
        message: `Error verificando políticas RLS: ${error}`,
        details: error
      })
    }

    // Test 8: Verificar Autenticación
    try {
      const { data: { user }, error: authError } = await getClient().auth.getUser()
      
      newResults.push({
        test: "Estado de Autenticación",
        status: !authError ? 'success' : 'warning',
        message: !authError
          ? `Usuario autenticado: ${user?.id || 'No user'}`
          : `Error de autenticación: ${authError.message}`,
        details: { user, error: authError }
      })
    } catch (error) {
      newResults.push({
        test: "Estado de Autenticación",
        status: 'error',
        message: `Error verificando autenticación: ${error}`,
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
        <h1 className="text-3xl font-bold mb-2">🔬 Diagnóstico Avanzado del Sistema</h1>
        <p className="text-muted-foreground">
          Análisis completo de configuración, conexiones y funcionalidades de Supabase
        </p>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Card className={healthStatus.healthy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Conexión</p>
                <p className="text-sm text-muted-foreground">
                  {healthStatus.details.connection ? '✅ Activa' : '❌ Inactiva'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Autenticación</p>
                <p className="text-sm text-muted-foreground">
                  {healthStatus.details.auth ? '✅ Funcionando' : '❌ Error'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Latencia</p>
                <p className="text-sm text-muted-foreground">
                  {healthStatus.details.latency}ms
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Configuración</p>
                <p className="text-sm text-muted-foreground">
                  {healthStatus.details.config.isConfigured ? '✅ Válida' : '❌ Inválida'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Diagnóstico Avanzado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runAdvancedDiagnostics} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando diagnóstico avanzado...
              </>
            ) : (
              "Ejecutar Diagnóstico Avanzado"
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
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      {result.duration && (
                        <Badge variant="outline">{result.duration}ms</Badge>
                      )}
                    </div>
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
              <li>Revisa que las políticas RLS estén configuradas correctamente</li>
              <li>Ejecuta las migraciones SQL si es necesario</li>
              <li>Revisa la consola del navegador para más detalles</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
