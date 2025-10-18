"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database } from "lucide-react"

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export function SupabaseDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const newResults: DiagnosticResult[] = []

    // Test 1: Verificar variables de entorno
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Variables de entorno:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado'
    })

    newResults.push({
      test: "Variables de Entorno",
      status: hasUrl && hasKey ? 'success' : 'error',
      message: hasUrl && hasKey 
        ? "Variables de entorno configuradas correctamente"
        : "Faltan variables de entorno. Crea un archivo .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
      details: {
        hasUrl,
        hasKey,
        url: hasUrl ? "Configurado" : "Faltante",
        key: hasKey ? "Configurado" : "Faltante"
      }
    })

    // Test 2: Verificar conexión a Supabase
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Test simple de conexión
      const { data, error } = await supabase.from('_test_connection').select('*').limit(1)
      
      newResults.push({
        test: "Conexión a Supabase",
        status: error ? 'warning' : 'success',
        message: error 
          ? "Conexión establecida pero tabla de prueba no existe (esto es normal)"
          : "Conexión a Supabase exitosa",
        details: { error: error?.message || 'Sin errores' }
      })
    } catch (error) {
      newResults.push({
        test: "Conexión a Supabase",
        status: 'error',
        message: "Error al conectar con Supabase",
        details: { error: error instanceof Error ? error.message : 'Error desconocido' }
      })
    }

    // Test 3: Verificar tablas principales
    const tables = ['suppliers', 'notifications', 'clients', 'work_orders']
    
    for (const table of tables) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data, error } = await supabase.from(table).select('*').limit(1)
        
        newResults.push({
          test: `Tabla ${table}`,
          status: error ? 'error' : 'success',
          message: error 
            ? `Tabla ${table} no existe o no es accesible`
            : `Tabla ${table} accesible`,
          details: { 
            error: error?.message,
            hasData: data ? data.length > 0 : false
          }
        })
      } catch (error) {
        newResults.push({
          test: `Tabla ${table}`,
          status: 'error',
          message: `Error al acceder a la tabla ${table}`,
          details: { error: error instanceof Error ? error.message : 'Error desconocido' }
        })
      }
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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Diagnóstico de Supabase
        </CardTitle>
        <CardDescription>
          Verifica la configuración y conexión con Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Ejecutando diagnóstico..." : "Ejecutar Diagnóstico"}
        </Button>

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
          <h4 className="font-semibold mb-2">Instrucciones para configurar Supabase:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Crea un archivo <code>.env.local</code> en la raíz del proyecto</li>
            <li>Agrega las siguientes variables:</li>
            <li><code>NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima</code></li>
            <li>Ejecuta las migraciones SQL en tu proyecto de Supabase</li>
            <li>Reinicia el servidor de desarrollo</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
