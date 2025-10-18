"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Loader2, Database, Settings, Shield, Zap, RefreshCw } from "lucide-react"
import { getConfig, validateConfig, getConfigInfo } from '@/lib/core/config'
import { healthCheck, getClientInfo } from '@/lib/core/supabase'
import { getCollectionsService } from '@/lib/services/collections-service'
import { useAppStore } from '@/lib/store/app-store'

interface DiagnosticResult {
  category: string
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
  duration?: number
  timestamp: string
}

interface DiagnosticSummary {
  total: number
  passed: number
  failed: number
  warnings: number
  duration: number
}

export default function DiagnosticoFinalPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  
  const { showSuccess, showError, showWarning, showInfo } = useAppStore((state) => ({
    showSuccess: state.addNotification,
    showError: state.addNotification,
    showWarning: state.addNotification,
    showInfo: state.addNotification
  }))

  const runCompleteDiagnostic = async () => {
    setIsRunning(true)
    setResults([])
    const startTime = Date.now()
    const newResults: DiagnosticResult[] = []

    try {
      // 1. CONFIGURACIÓN
      console.log('🔧 Verificando configuración...')
      
      // 1.1 Validar configuración
      try {
        const configStart = Date.now()
        const config = getConfig()
        const configDuration = Date.now() - configStart
        
        newResults.push({
          category: 'Configuración',
          test: 'Validación de Configuración',
          status: 'success',
          message: 'Configuración válida y cargada correctamente',
          details: {
            environment: config.NODE_ENV,
            version: config.NEXT_PUBLIC_APP_VERSION,
            supabaseConfigured: !!(config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_ANON_KEY)
          },
          duration: configDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Configuración',
          test: 'Validación de Configuración',
          status: 'error',
          message: `Error en configuración: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 1.2 Información de configuración
      try {
        const configInfo = getConfigInfo()
        newResults.push({
          category: 'Configuración',
          test: 'Información de Configuración',
          status: 'success',
          message: 'Información de configuración obtenida correctamente',
          details: configInfo,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Configuración',
          test: 'Información de Configuración',
          status: 'error',
          message: `Error obteniendo información: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 2. SUPABASE
      console.log('🗄️ Verificando Supabase...')
      
      // 2.1 Health Check
      try {
        const healthStart = Date.now()
        const health = await healthCheck()
        const healthDuration = Date.now() - healthStart
        
        newResults.push({
          category: 'Supabase',
          test: 'Health Check del Sistema',
          status: health.healthy ? 'success' : 'error',
          message: health.healthy 
            ? `Sistema saludable (${health.details.latency}ms)`
            : `Sistema no saludable: ${health.error}`,
          details: health.details,
          duration: healthDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Supabase',
          test: 'Health Check del Sistema',
          status: 'error',
          message: `Error en health check: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 2.2 Información del cliente
      try {
        const clientInfo = getClientInfo()
        newResults.push({
          category: 'Supabase',
          test: 'Información del Cliente',
          status: 'success',
          message: 'Información del cliente obtenida correctamente',
          details: clientInfo,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Supabase',
          test: 'Información del Cliente',
          status: 'error',
          message: `Error obteniendo información del cliente: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 3. SERVICIOS
      console.log('🔧 Verificando servicios...')
      
      // 3.1 Servicio de Collections
      try {
        const serviceStart = Date.now()
        const collectionsService = getCollectionsService()
        const collections = await collectionsService.getAll()
        const serviceDuration = Date.now() - serviceStart
        
        newResults.push({
          category: 'Servicios',
          test: 'Servicio de Collections',
          status: 'success',
          message: `Servicio funcionando correctamente (${collections.length} registros)`,
          details: { count: collections.length, duration: serviceDuration },
          duration: serviceDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Servicios',
          test: 'Servicio de Collections',
          status: 'error',
          message: `Error en servicio de collections: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 3.2 Estadísticas de Collections
      try {
        const statsStart = Date.now()
        const collectionsService = getCollectionsService()
        const stats = await collectionsService.getStats()
        const statsDuration = Date.now() - statsStart
        
        newResults.push({
          category: 'Servicios',
          test: 'Estadísticas de Collections',
          status: 'success',
          message: 'Estadísticas obtenidas correctamente',
          details: stats,
          duration: statsDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Servicios',
          test: 'Estadísticas de Collections',
          status: 'error',
          message: `Error obteniendo estadísticas: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 4. BASE DE DATOS
      console.log('🗄️ Verificando base de datos...')
      
      // 4.1 Verificar tabla collections
      try {
        const dbStart = Date.now()
        const collectionsService = getCollectionsService()
        const client = collectionsService.getClient()
        const { data, error } = await client
          .from('collections')
          .select('id')
          .limit(1)
        const dbDuration = Date.now() - dbStart
        
        newResults.push({
          category: 'Base de Datos',
          test: 'Tabla Collections',
          status: !error ? 'success' : 'error',
          message: !error 
            ? `Tabla collections accesible (${dbDuration}ms)`
            : `Error accediendo a tabla: ${error.message}`,
          details: { error, duration: dbDuration },
          duration: dbDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Base de Datos',
          test: 'Tabla Collections',
          status: 'error',
          message: `Error verificando tabla: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 4.2 Verificar otras tablas críticas
      const criticalTables = ['suppliers', 'payments', 'purchase_orders', 'invoices']
      
      for (const table of criticalTables) {
        try {
          const tableStart = Date.now()
          const collectionsService = getCollectionsService()
          const client = collectionsService.getClient()
          const { data, error } = await client
            .from(table)
            .select('id')
            .limit(1)
          const tableDuration = Date.now() - tableStart
          
          newResults.push({
            category: 'Base de Datos',
            test: `Tabla ${table}`,
            status: !error ? 'success' : 'error',
            message: !error 
              ? `Tabla ${table} accesible (${tableDuration}ms)`
              : `Error accediendo a tabla ${table}: ${error.message}`,
            details: { error, duration: tableDuration },
            duration: tableDuration,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          newResults.push({
            category: 'Base de Datos',
            test: `Tabla ${table}`,
            status: 'error',
            message: `Error verificando tabla ${table}: ${error}`,
            details: error,
            timestamp: new Date().toISOString()
          })
        }
      }

      // 5. AUTENTICACIÓN
      console.log('🔐 Verificando autenticación...')
      
      try {
        const authStart = Date.now()
        const collectionsService = getCollectionsService()
        const client = collectionsService.getClient()
        const { data: { user }, error } = await client.auth.getUser()
        const authDuration = Date.now() - authStart
        
        newResults.push({
          category: 'Autenticación',
          test: 'Estado de Autenticación',
          status: !error ? 'success' : 'warning',
          message: !error
            ? `Usuario autenticado: ${user?.id || 'No user'}`
            : `Error de autenticación: ${error.message}`,
          details: { user, error, duration: authDuration },
          duration: authDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Autenticación',
          test: 'Estado de Autenticación',
          status: 'error',
          message: `Error verificando autenticación: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // 6. RENDIMIENTO
      console.log('⚡ Verificando rendimiento...')
      
      try {
        const perfStart = Date.now()
        const collectionsService = getCollectionsService()
        
        // Test de rendimiento con múltiples operaciones
        const [collections, stats] = await Promise.all([
          collectionsService.getAll({ limit: 10 }),
          collectionsService.getStats()
        ])
        
        const perfDuration = Date.now() - perfStart
        
        newResults.push({
          category: 'Rendimiento',
          test: 'Operaciones Concurrentes',
          status: 'success',
          message: `Operaciones concurrentes completadas (${perfDuration}ms)`,
          details: { 
            collectionsCount: collections.length,
            statsAvailable: !!stats,
            duration: perfDuration
          },
          duration: perfDuration,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        newResults.push({
          category: 'Rendimiento',
          test: 'Operaciones Concurrentes',
          status: 'error',
          message: `Error en test de rendimiento: ${error}`,
          details: error,
          timestamp: new Date().toISOString()
        })
      }

      // Calcular resumen
      const totalDuration = Date.now() - startTime
      const passed = newResults.filter(r => r.status === 'success').length
      const failed = newResults.filter(r => r.status === 'error').length
      const warnings = newResults.filter(r => r.status === 'warning').length

      setSummary({
        total: newResults.length,
        passed,
        failed,
        warnings,
        duration: totalDuration
      })

      setResults(newResults)
      setLastRun(new Date().toISOString())

      // Mostrar notificación de resultado
      if (failed === 0) {
        showSuccess('Diagnóstico Completado', `Todos los tests pasaron (${passed} tests)`)
      } else if (failed <= 2) {
        showWarning('Diagnóstico Completado', `${passed} tests pasaron, ${failed} fallaron`)
      } else {
        showError('Diagnóstico Completado', `${failed} tests fallaron de ${newResults.length} total`)
      }

    } catch (error) {
      console.error('Error ejecutando diagnóstico:', error)
      showError('Error en Diagnóstico', 'Error inesperado durante el diagnóstico')
    } finally {
      setIsRunning(false)
    }
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Configuración': return <Settings className="h-5 w-5" />
      case 'Supabase': return <Database className="h-5 w-5" />
      case 'Servicios': return <Zap className="h-5 w-5" />
      case 'Base de Datos': return <Database className="h-5 w-5" />
      case 'Autenticación': return <Shield className="h-5 w-5" />
      case 'Rendimiento': return <Zap className="h-5 w-5" />
      default: return <Settings className="h-5 w-5" />
    }
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, DiagnosticResult[]>)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔬 Diagnóstico Final del Sistema</h1>
        <p className="text-muted-foreground">
          Análisis completo de la arquitectura robusta implementada
        </p>
      </div>

      {/* Resumen */}
      {summary && (
        <Card className={summary.failed === 0 ? "border-green-200 bg-green-50" : summary.failed <= 2 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Resumen del Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
                <p className="text-sm text-muted-foreground">Exitosos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                <p className="text-sm text-muted-foreground">Fallidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{summary.warnings}</p>
                <p className="text-sm text-muted-foreground">Advertencias</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.duration}ms</p>
                <p className="text-sm text-muted-foreground">Duración</p>
              </div>
            </div>
            {lastRun && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Última ejecución: {new Date(lastRun).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Diagnóstico Completo del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runCompleteDiagnostic} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando diagnóstico completo...
              </>
            ) : (
              "Ejecutar Diagnóstico Completo"
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Resultados del Diagnóstico</h3>
              
              {Object.entries(groupedResults).map(([category, categoryResults]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <h4 className="text-md font-semibold">{category}</h4>
                  </div>
                  
                  <div className="space-y-2 ml-6">
                    {categoryResults.map((result, index) => (
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
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">✅ Arquitectura Robusta Implementada:</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Sistema de configuración centralizado y validado</li>
              <li>Cliente Supabase unificado con singleton</li>
              <li>Manejo de errores robusto con retry logic</li>
              <li>Servicios base abstractos con validación</li>
              <li>Estado global centralizado con Zustand</li>
              <li>Testing automatizado con mocks</li>
              <li>Base de datos completamente configurada</li>
              <li>Logging estructurado para debugging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
