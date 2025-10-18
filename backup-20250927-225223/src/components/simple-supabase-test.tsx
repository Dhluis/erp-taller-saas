"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database } from "lucide-react"

export function SimpleSupabaseTest() {
  const [results, setResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTest = async () => {
    setIsRunning(true)
    const newResults: any[] = []

    // Test 1: Variables de entorno
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔍 Variables de entorno detectadas:', {
      URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ No configurado'
    })

    newResults.push({
      test: "Variables de Entorno",
      status: hasUrl && hasKey ? 'success' : 'error',
      message: hasUrl && hasKey 
        ? "✅ Variables de entorno configuradas correctamente"
        : "❌ Faltan variables de entorno",
      details: {
        url: hasUrl ? "✅ Configurado" : "❌ Faltante",
        key: hasKey ? "✅ Configurado" : "❌ Faltante"
      }
    })

    // Test 2: Conexión directa
    try {
      const response = await fetch('https://igshgleciwknpupbmvhn.supabase.co/rest/v1/suppliers?select=*&limit=1', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q'
        }
      })

      if (response.ok) {
        const data = await response.json()
        newResults.push({
          test: "Conexión Directa a Supabase",
          status: 'success',
          message: "✅ Conexión exitosa a Supabase",
          details: { 
            status: response.status,
            dataCount: data.length,
            sampleData: data[0]?.name || 'Sin datos'
          }
        })
      } else {
        newResults.push({
          test: "Conexión Directa a Supabase",
          status: 'error',
          message: "❌ Error en la conexión",
          details: { status: response.status, statusText: response.statusText }
        })
      }
    } catch (error) {
      newResults.push({
        test: "Conexión Directa a Supabase",
        status: 'error',
        message: "❌ Error de conexión",
        details: { error: error instanceof Error ? error.message : 'Error desconocido' }
      })
    }

    // Test 3: Cliente Supabase
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase.from('suppliers').select('*').limit(1)
      
      newResults.push({
        test: "Cliente Supabase",
        status: error ? 'error' : 'success',
        message: error 
          ? `❌ Error con cliente Supabase: ${error.message}`
          : "✅ Cliente Supabase funcionando correctamente",
        details: { 
          error: error?.message,
          dataCount: data?.length || 0
        }
      })
    } catch (error) {
      newResults.push({
        test: "Cliente Supabase",
        status: 'error',
        message: "❌ Error al crear cliente Supabase",
        details: { error: error instanceof Error ? error.message : 'Error desconocido' }
      })
    }

    setResults(newResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Prueba Simple de Supabase
        </CardTitle>
        <CardDescription>
          Prueba directa de conexión con Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Ejecutando prueba..." : "Ejecutar Prueba Simple"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resultados de la Prueba</h3>
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
          <h4 className="font-semibold mb-2">Información de Debug:</h4>
          <p className="text-sm">
            Abre la consola del navegador (F12) para ver los logs detallados de la prueba.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

