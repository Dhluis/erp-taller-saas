"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Settings, Database, Zap } from "lucide-react"
import { config, validateConfig, getSupabaseConfig, getAppConfig } from '@/lib/config'
import { getSupabaseClient, testSupabaseConnection, getSupabaseInfo } from '@/lib/supabase/client'
import { useErrorHandler } from '@/lib/utils/error-handler'
import { SupabaseDiagnosticV2 } from '@/components/supabase-diagnostic-v2'

export default function TestFase1Page() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { error, setError, clearError, handleAsyncError } = useErrorHandler()

  const runFase1Tests = async () => {
    setIsRunning(true)
    clearError()
    const results: any[] = []

    try {
      // Test 1: Configuración
      try {
        validateConfig()
        results.push({
          test: "Configuración",
          status: "success",
          message: "✅ Configuración válida",
          details: {
            url: config.supabase.url,
            hasAnonKey: !!config.supabase.anonKey,
            environment: config.app.environment
          }
        })
      } catch (error) {
        results.push({
          test: "Configuración",
          status: "error",
          message: "❌ Error en configuración",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 2: Cliente Supabase
      try {
        const client = getSupabaseClient()
        const info = getSupabaseInfo()
        results.push({
          test: "Cliente Supabase",
          status: "success",
          message: "✅ Cliente inicializado correctamente",
          details: info
        })
      } catch (error) {
        results.push({
          test: "Cliente Supabase",
          status: "error",
          message: "❌ Error inicializando cliente",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 3: Conexión
      try {
        const isConnected = await testSupabaseConnection()
        results.push({
          test: "Conexión",
          status: isConnected ? "success" : "error",
          message: isConnected ? "✅ Conexión exitosa" : "❌ Conexión falló",
          details: { connected: isConnected }
        })
      } catch (error) {
        results.push({
          test: "Conexión",
          status: "error",
          message: "❌ Error de conexión",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 4: Manejo de errores
      try {
        const result = await handleAsyncError(async () => {
          throw new Error("Test error")
        })
        
        results.push({
          test: "Manejo de Errores",
          status: result === null ? "success" : "error",
          message: result === null ? "✅ Manejo de errores funciona" : "❌ Manejo de errores falló",
          details: { errorHandled: result === null }
        })
      } catch (error) {
        results.push({
          test: "Manejo de Errores",
          status: "error",
          message: "❌ Error en manejo de errores",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

    } catch (error) {
      setError(error)
    }

    setTestResults(results)
    setIsRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Éxito</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      case 'warning': return <Badge className="bg-yellow-500">Advertencia</Badge>
      default: return <Badge variant="outline">Desconocido</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🧪 Test Fase 1: Fundamentos</h1>
        <p className="text-muted-foreground">
          Verifica que el sistema de configuración, cliente Supabase y manejo de errores funcionen correctamente
        </p>
      </div>

      {/* Información de Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Supabase</h4>
              <div className="space-y-1 text-sm">
                <div>URL: {config.supabase.url ? '✅ Configurado' : '❌ No configurado'}</div>
                <div>Anon Key: {config.supabase.anonKey ? '✅ Configurado' : '❌ No configurado'}</div>
                <div>Service Role: {config.supabase.serviceRoleKey ? '✅ Configurado' : '❌ No configurado'}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Aplicación</h4>
              <div className="space-y-1 text-sm">
                <div>Nombre: {config.app.name}</div>
                <div>Versión: {config.app.version}</div>
                <div>Entorno: {config.app.environment}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de Fase 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Tests de Fase 1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runFase1Tests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? "Ejecutando tests..." : "Ejecutar Tests de Fase 1"}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Error Global:</h4>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Resultados de los Tests</h3>
              {testResults.map((result, index) => (
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
        </CardContent>
      </Card>

      {/* Diagnóstico Avanzado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Diagnóstico Avanzado de Supabase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SupabaseDiagnosticV2 />
        </CardContent>
      </Card>

      {/* Resumen de Fase 1 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Resumen de Fase 1</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Sistema de configuración centralizada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Cliente Supabase centralizado con validación</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Sistema de manejo de errores unificado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Hooks de manejo de errores para componentes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Diagnóstico avanzado de Supabase</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
