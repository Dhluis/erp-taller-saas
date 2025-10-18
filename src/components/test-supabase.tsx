"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TestSupabase() {
  const [result, setResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setResult("Probando conexión...")
    
    try {
      // Test directo a Supabase
      const response = await fetch('https://igshgleciwknpupbmvhn.supabase.co/rest/v1/suppliers?select=*&limit=1', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1MjAsImV4cCI6MjA3NDMwODUyMH0.u3EAXSQTT87R2O5vHMyGE0hFLKLcB6LjkgHqkKclx2Q'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setResult(`✅ ¡Conexión exitosa! Se encontraron ${data.length} proveedores.`)
        console.log('✅ Supabase funcionando:', data)
      } else {
        setResult(`❌ Error: ${response.status} - ${response.statusText}`)
        console.error('❌ Error de Supabase:', response.status, response.statusText)
      }
    } catch (error) {
      setResult(`❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      console.error('❌ Error:', error)
    }
    
    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Prueba de Supabase</CardTitle>
        <CardDescription>
          Prueba simple de conexión con la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Probando..." : "Probar Conexión"}
        </Button>
        
        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">{result}</p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Abre la consola (F12) para ver logs detallados
        </div>
      </CardContent>
    </Card>
  )
}

