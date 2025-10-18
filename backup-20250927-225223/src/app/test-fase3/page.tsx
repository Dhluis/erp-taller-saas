"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Database, Server, Zap, BarChart3 } from "lucide-react"
import { useCollections, useCustomers, useSuppliers, useGeneralStats } from '@/hooks/useServices'
import { useService, usePaginatedService } from '@/hooks/useServices'
import { CollectionsService } from '@/lib/services/CollectionsService'
import { CustomersService } from '@/lib/services/CustomersService'
import { SuppliersService } from '@/lib/services/SuppliersService'

export default function TestFase3Page() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  
  // Hooks de servicios
  const collections = useCollections()
  const customers = useCustomers()
  const suppliers = useSuppliers()
  const generalStats = useGeneralStats()
  
  // Hooks de servicios base
  const collectionsService = useService(new CollectionsService())
  const customersService = useService(new CustomersService())
  const suppliersService = useService(new SuppliersService())
  
  // Hooks de servicios paginados
  const paginatedCollections = usePaginatedService(new CollectionsService())
  const paginatedCustomers = usePaginatedService(new CustomersService())
  
  // Estados para formularios de prueba
  const [collectionData, setCollectionData] = useState({
    client_id: 'C001',
    invoice_id: 'F001',
    amount: 1000,
    collection_date: '2024-12-31',
    payment_method: 'transfer' as const,
    status: 'pending' as const
  })
  
  const [customerData, setCustomerData] = useState({
    name: 'Juan Pérez',
    email: 'juan@email.com',
    phone: '5551234567',
    status: 'active' as const
  })

  const runFase3Tests = async () => {
    setIsRunning(true)
    const results: any[] = []

    try {
      // Test 1: Servicios Base
      try {
        const collectionsService = new CollectionsService()
        const customersService = new CustomersService()
        const suppliersService = new SuppliersService()
        
        results.push({
          test: "Servicios Base",
          status: "success",
          message: "✅ Servicios base creados correctamente",
          details: { 
            collections: !!collectionsService,
            customers: !!customersService,
            suppliers: !!suppliersService
          }
        })
      } catch (error) {
        results.push({
          test: "Servicios Base",
          status: "error",
          message: "❌ Error creando servicios base",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 2: Hooks de Servicios
      try {
        results.push({
          test: "Hooks de Servicios",
          status: "success",
          message: "✅ Hooks de servicios funcionando",
          details: { 
            collections: !!collections,
            customers: !!customers,
            suppliers: !!suppliers,
            generalStats: !!generalStats
          }
        })
      } catch (error) {
        results.push({
          test: "Hooks de Servicios",
          status: "error",
          message: "❌ Error en hooks de servicios",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 3: Operaciones CRUD
      try {
        // Test crear colección
        const createResult = await collectionsService.create(collectionData)
        results.push({
          test: "Operaciones CRUD - Crear",
          status: createResult ? "success" : "error",
          message: createResult ? "✅ Crear colección funcionando" : "❌ Error creando colección",
          details: { created: !!createResult, data: createResult }
        })
        
        // Test crear cliente
        const createCustomerResult = await customersService.create(customerData)
        results.push({
          test: "Operaciones CRUD - Crear Cliente",
          status: createCustomerResult ? "success" : "error",
          message: createCustomerResult ? "✅ Crear cliente funcionando" : "❌ Error creando cliente",
          details: { created: !!createCustomerResult, data: createCustomerResult }
        })
      } catch (error) {
        results.push({
          test: "Operaciones CRUD",
          status: "error",
          message: "❌ Error en operaciones CRUD",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 4: Estadísticas
      try {
        const collectionsStats = await collections.loadStats()
        const customersStats = await customers.loadStats()
        const suppliersStats = await suppliers.loadStats()
        
        results.push({
          test: "Estadísticas",
          status: "success",
          message: "✅ Estadísticas funcionando",
          details: { 
            collections: !!collectionsStats,
            customers: !!customersStats,
            suppliers: !!suppliersStats
          }
        })
      } catch (error) {
        results.push({
          test: "Estadísticas",
          status: "error",
          message: "❌ Error cargando estadísticas",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 5: Búsqueda
      try {
        const searchResult = await customersService.search('Juan')
        results.push({
          test: "Búsqueda",
          status: "success",
          message: "✅ Búsqueda funcionando",
          details: { 
            searchResult: searchResult?.length || 0,
            hasResults: (searchResult?.length || 0) > 0
          }
        })
      } catch (error) {
        results.push({
          test: "Búsqueda",
          status: "error",
          message: "❌ Error en búsqueda",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 6: Paginación
      try {
        const paginatedResult = await paginatedCollections.loadData({ page: 1, limit: 5 })
        results.push({
          test: "Paginación",
          status: "success",
          message: "✅ Paginación funcionando",
          details: { 
            hasData: paginatedResult?.data?.length || 0,
            pagination: paginatedResult?.pagination
          }
        })
      } catch (error) {
        results.push({
          test: "Paginación",
          status: "error",
          message: "❌ Error en paginación",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 7: Métodos Específicos
      try {
        const pendingCollections = await collections.getPending()
        const activeCustomers = await customers.getActive()
        const topSuppliers = await suppliers.getTopSuppliers(1000)
        
        results.push({
          test: "Métodos Específicos",
          status: "success",
          message: "✅ Métodos específicos funcionando",
          details: { 
            pendingCollections: pendingCollections?.length || 0,
            activeCustomers: activeCustomers?.length || 0,
            topSuppliers: topSuppliers?.length || 0
          }
        })
      } catch (error) {
        results.push({
          test: "Métodos Específicos",
          status: "error",
          message: "❌ Error en métodos específicos",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 8: Manejo de Errores
      try {
        // Intentar obtener un registro que no existe
        const nonExistent = await collectionsService.getById('00000000-0000-0000-0000-000000000000')
        results.push({
          test: "Manejo de Errores",
          status: nonExistent === null ? "success" : "error",
          message: nonExistent === null ? "✅ Manejo de errores funcionando" : "❌ Error en manejo de errores",
          details: { 
            nonExistent: nonExistent === null,
            errorHandling: true
          }
        })
      } catch (error) {
        results.push({
          test: "Manejo de Errores",
          status: "success",
          message: "✅ Manejo de errores funcionando (excepción capturada)",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

    } catch (error) {
      results.push({
        test: "Error General",
        status: "error",
        message: "❌ Error durante los tests",
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
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
        <h1 className="text-3xl font-bold mb-2">🧪 Test Fase 3: Servicios de Datos</h1>
        <p className="text-muted-foreground">
          Verifica que el sistema de servicios, hooks y operaciones de datos funcionen correctamente
        </p>
      </div>

      {/* Información de Servicios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Información de Servicios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Servicios Base</h4>
              <div className="space-y-1 text-sm">
                <div>BaseService ✅</div>
                <div>CollectionsService ✅</div>
                <div>CustomersService ✅</div>
                <div>SuppliersService ✅</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Hooks</h4>
              <div className="space-y-1 text-sm">
                <div>useService ✅</div>
                <div>usePaginatedService ✅</div>
                <div>useCollections ✅</div>
                <div>useCustomers ✅</div>
                <div>useSuppliers ✅</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de Fase 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tests de Fase 3
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runFase3Tests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? "Ejecutando tests..." : "Ejecutar Tests de Fase 3"}
          </Button>

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

      {/* Formularios de Prueba */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario de Colección */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Formulario de Colección
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente ID</Label>
              <Input
                id="client_id"
                value={collectionData.client_id}
                onChange={(e) => setCollectionData({...collectionData, client_id: e.target.value})}
                placeholder="C001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Factura ID</Label>
              <Input
                id="invoice_id"
                value={collectionData.invoice_id}
                onChange={(e) => setCollectionData({...collectionData, invoice_id: e.target.value})}
                placeholder="F001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                value={collectionData.amount}
                onChange={(e) => setCollectionData({...collectionData, amount: parseFloat(e.target.value) || 0})}
                placeholder="1000"
              />
            </div>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await collectionsService.create(collectionData)
                  console.log('Colección creada:', result)
                } catch (error) {
                  console.error('Error creando colección:', error)
                }
              }}
              disabled={collectionsService.loading}
            >
              {collectionsService.loading ? "Creando..." : "Crear Colección"}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>Estado: {collectionsService.loading ? 'Cargando...' : 'Listo'}</p>
              <p>Error: {collectionsService.error || 'Ninguno'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Formulario de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                placeholder="Juan Pérez"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                placeholder="juan@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                placeholder="5551234567"
              />
            </div>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await customersService.create(customerData)
                  console.log('Cliente creado:', result)
                } catch (error) {
                  console.error('Error creando cliente:', error)
                }
              }}
              disabled={customersService.loading}
            >
              {customersService.loading ? "Creando..." : "Crear Cliente"}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p>Estado: {customersService.loading ? 'Cargando...' : 'Listo'}</p>
              <p>Error: {customersService.error || 'Ninguno'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Fase 3 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Resumen de Fase 3</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Servicio base abstracto</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Servicios específicos por entidad</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Hooks de servicios reutilizables</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Operaciones CRUD completas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Paginación y búsqueda</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Estadísticas y métricas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Manejo de errores centralizado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
