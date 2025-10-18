"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw, Settings } from "lucide-react"
import { config, validateConfig } from '@/lib/config'
import { getSupabaseClient, testSupabaseConnection, getSupabaseInfo } from '@/lib/supabase/client'
import { handleError, logError } from '@/lib/errors'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
  solution?: string
}

export function SupabaseDiagnosticV2() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const newResults: DiagnosticResult[] = []

    try {
      // Test 1: Verificar configuración
      try {
        validateConfig()
        newResults.push({
          test: "Configuración",
          status: 'success',
          message: "Configuración válida",
          details: {
            url: config.supabase.url,
            hasAnonKey: !!config.supabase.anonKey,
            hasServiceRoleKey: !!config.supabase.serviceRoleKey,
            environment: config.app.environment
          }
        })
      } catch (error) {
        const appError = handleError(error)
        newResults.push({
          test: "Configuración",
          status: 'error',
          message: appError.message,
          details: { error: appError.toJSON() },
          solution: "Verifica que las variables de entorno estén configuradas correctamente"
        })
      }

      // Test 2: Verificar cliente Supabase
      try {
        const client = getSupabaseClient()
        const info = getSupabaseInfo()
        
        newResults.push({
          test: "Cliente Supabase",
          status: 'success',
          message: "Cliente inicializado correctamente",
          details: info
        })
      } catch (error) {
        const appError = handleError(error)
        newResults.push({
          test: "Cliente Supabase",
          status: 'error',
          message: appError.message,
          details: { error: appError.toJSON() },
          solution: "Verifica la configuración de Supabase"
        })
      }

      // Test 3: Verificar conexión
      try {
        const isConnected = await testSupabaseConnection()
        newResults.push({
          test: "Conexión",
          status: isConnected ? 'success' : 'error',
          message: isConnected 
            ? "Conexión exitosa con Supabase"
            : "No se pudo conectar con Supabase",
          details: { connected: isConnected }
        })
      } catch (error) {
        const appError = handleError(error)
        newResults.push({
          test: "Conexión",
          status: 'error',
          message: appError.message,
          details: { error: appError.toJSON() },
          solution: "Verifica tu conexión a internet y la URL de Supabase"
        })
      }

      // Test 4: Verificar tablas principales
      const tables = ['collections', 'suppliers', 'payments', 'purchase_orders', 'customers', 'vehicles']
      
      for (const table of tables) {
        try {
          const client = getSupabaseClient()
          const { data, error } = await client.from(table).select('*').limit(1)
          
          newResults.push({
            test: `Tabla ${table}`,
            status: error ? 'error' : 'success',
            message: error 
              ? `Tabla ${table} no existe o no es accesible`
              : `Tabla ${table} accesible`,
            details: { 
              error: error?.message,
              hasData: data ? data.length > 0 : false,
              tableExists: !error
            },
            solution: error ? `Ejecuta el script SQL para crear la tabla ${table}` : undefined
          })
        } catch (error) {
          const appError = handleError(error)
          newResults.push({
            test: `Tabla ${table}`,
            status: 'error',
            message: `Error al acceder a la tabla ${table}`,
            details: { error: appError.toJSON() },
            solution: `Verifica que la tabla ${table} existe en tu base de datos`
          })
        }
      }

    } catch (error) {
      const appError = handleError(error)
      logError(appError, { component: 'SupabaseDiagnosticV2' })
      
      newResults.push({
        test: "Diagnóstico General",
        status: 'error',
        message: "Error durante el diagnóstico",
        details: { error: appError.toJSON() }
      })
    }

    setResults(newResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Éxito</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      case 'warning': return <Badge className="bg-yellow-500">Advertencia</Badge>
    }
  }

  const getSummaryStats = () => {
    const total = results.length
    const success = results.filter(r => r.status === 'success').length
    const errors = results.filter(r => r.status === 'error').length
    const warnings = results.filter(r => r.status === 'warning').length
    
    return { total, success, errors, warnings }
  }

  const stats = getSummaryStats()

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Diagnóstico Avanzado de Supabase
        </CardTitle>
        <CardDescription>
          Verifica la configuración, conexión y estado de las tablas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Ejecutar Diagnóstico
              </>
            )}
          </Button>
          
          {results.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => setResults([])}
            >
              Limpiar
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-sm text-muted-foreground">Éxito</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
                <div className="text-sm text-muted-foreground">Advertencias</div>
              </div>
            </div>

            {/* Resultados */}
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
                  
                  {result.solution && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <strong>💡 Solución:</strong> {result.solution}
                    </div>
                  )}
                  
                  {result.details && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Ver detalles técnicos</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Instrucciones de Configuración
          </h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Crea un archivo <code>.env.local</code> en la raíz del proyecto</li>
            <li>Agrega las siguientes variables:</li>
            <li><code>NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima</code></li>
            <li>Ejecuta el script <code>SOLUCION_COMPLETA_FINAL.sql</code> en Supabase</li>
            <li>Reinicia el servidor de desarrollo</li>
            <li>Ejecuta este diagnóstico nuevamente</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
