"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  getInventoryMovements, 
  getMovementStats,
  InventoryMovement 
} from "@/lib/supabase/inventory-movements"

export function TestInventoryFunctions() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    movements: InventoryMovement[]
    stats: any
    error: string | null
  }>({
    movements: [],
    stats: null,
    error: null
  })

  const testFunctions = async () => {
    setIsLoading(true)
    setResults({ movements: [], stats: null, error: null })

    try {
      console.log('🧪 Testing inventory functions...')
      
      // Test getInventoryMovements
      console.log('📦 Testing getInventoryMovements...')
      const movements = await getInventoryMovements()
      console.log('✅ getInventoryMovements result:', movements)

      // Test getMovementStats
      console.log('📊 Testing getMovementStats...')
      const stats = await getMovementStats()
      console.log('✅ getMovementStats result:', stats)

      setResults({
        movements,
        stats,
        error: null
      })

      console.log('🎉 All tests completed successfully!')
    } catch (error) {
      console.error('❌ Test failed:', error)
      setResults({
        movements: [],
        stats: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Test de Funciones de Inventario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testFunctions} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Probando...' : 'Probar Funciones de Inventario'}
        </Button>

        {results.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">❌ Error:</p>
            <p className="text-red-600 text-sm">{results.error}</p>
          </div>
        )}

        {results.movements.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 font-medium">✅ Movimientos encontrados: {results.movements.length}</p>
            <div className="text-green-600 text-sm">
              {results.movements.slice(0, 3).map((movement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline">{movement.movement_type}</Badge>
                  <span>Cantidad: {movement.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.stats && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-medium">📊 Estadísticas:</p>
            <div className="text-blue-600 text-sm grid grid-cols-2 gap-2 mt-2">
              <div>Total: {results.stats.totalMovements}</div>
              <div>Entradas: {results.stats.movementsIn}</div>
              <div>Salidas: {results.stats.movementsOut}</div>
              <div>Ajustes hoy: {results.stats.adjustmentsToday}</div>
            </div>
          </div>
        )}

        {!results.error && results.movements.length === 0 && results.stats && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 font-medium">⚠️ Sin datos</p>
            <p className="text-yellow-600 text-sm">
              Las funciones funcionan correctamente pero no hay movimientos en la base de datos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
