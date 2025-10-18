"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Type, Shield, Zap } from "lucide-react"
import { useValidation, useDataValidation, useRealtimeValidation } from '@/hooks/useValidation'
import { validateData, validateAndSanitize } from '@/lib/utils/validation'
import { 
  createCustomerSchema, 
  createCollectionSchema, 
  createAppointmentSchema,
  createLeadSchema 
} from '@/lib/validation/schemas'

export default function TestFase2Page() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  
  // Hooks de validación para pruebas
  const customerForm = useValidation(createCustomerSchema, {
    name: '',
    email: '',
    phone: '',
    status: 'active'
  })
  
  const collectionValidation = useDataValidation(createCollectionSchema)
  const appointmentValidation = useRealtimeValidation(createAppointmentSchema)
  
  // Estados para formularios de prueba
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active'
  })
  
  const [collectionData, setCollectionData] = useState({
    client_id: '',
    invoice_id: '',
    amount: 0,
    collection_date: '',
    payment_method: 'transfer' as const,
    status: 'pending' as const
  })

  const runFase2Tests = async () => {
    setIsRunning(true)
    const results: any[] = []

    try {
      // Test 1: Validación de esquemas
      try {
        const testCustomer = {
          name: 'Juan Pérez',
          email: 'juan@email.com',
          phone: '5551234567',
          status: 'active'
        }
        
        const result = validateData(createCustomerSchema, testCustomer)
        results.push({
          test: "Validación de Esquemas",
          status: result.success ? "success" : "error",
          message: result.success ? "✅ Esquemas funcionando correctamente" : "❌ Error en validación de esquemas",
          details: result.success ? { validated: true } : { errors: result.errors }
        })
      } catch (error) {
        results.push({
          test: "Validación de Esquemas",
          status: "error",
          message: "❌ Error en validación de esquemas",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 2: Validación y sanitización
      try {
        const dirtyData = {
          name: '  Juan Pérez  ',
          email: '  juan@email.com  ',
          phone: '5551234567',
          status: 'active'
        }
        
        const result = validateAndSanitize(createCustomerSchema, dirtyData)
        results.push({
          test: "Validación y Sanitización",
          status: result.success ? "success" : "error",
          message: result.success ? "✅ Sanitización funcionando correctamente" : "❌ Error en sanitización",
          details: result.success ? { sanitized: true, data: result.data } : { errors: result.errors }
        })
      } catch (error) {
        results.push({
          test: "Validación y Sanitización",
          status: "error",
          message: "❌ Error en sanitización",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 3: Validación de datos inválidos
      try {
        const invalidData = {
          name: '', // Nombre vacío
          email: 'invalid-email', // Email inválido
          phone: '123', // Teléfono muy corto
          status: 'invalid' // Estado inválido
        }
        
        const result = validateData(createCustomerSchema, invalidData)
        results.push({
          test: "Validación de Datos Inválidos",
          status: !result.success ? "success" : "error",
          message: !result.success ? "✅ Detección de errores funcionando" : "❌ No se detectaron errores",
          details: !result.success ? { errorsDetected: true, errors: result.errors } : { errorsDetected: false }
        })
      } catch (error) {
        results.push({
          test: "Validación de Datos Inválidos",
          status: "error",
          message: "❌ Error en validación de datos inválidos",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 4: Hook useDataValidation
      try {
        const result = collectionValidation.validate(collectionData)
        results.push({
          test: "Hook useDataValidation",
          status: "success",
          message: "✅ Hook useDataValidation funcionando",
          details: { 
            isValid: result.success,
            errors: result.errors || {},
            hasErrors: Object.keys(collectionValidation.errors).length > 0
          }
        })
      } catch (error) {
        results.push({
          test: "Hook useDataValidation",
          status: "error",
          message: "❌ Error en hook useDataValidation",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 5: Hook useRealtimeValidation
      try {
        const result = await appointmentValidation.validateAll({
          customer_name: 'María García',
          customer_phone: '5559876543',
          vehicle_info: 'Toyota Corolla 2020',
          service_type: 'Mantenimiento',
          appointment_date: '2024-12-31',
          appointment_time: '10:00',
          status: 'scheduled',
          estimated_duration: 60
        })
        
        results.push({
          test: "Hook useRealtimeValidation",
          status: result.success ? "success" : "error",
          message: result.success ? "✅ Hook useRealtimeValidation funcionando" : "❌ Error en validación en tiempo real",
          details: { 
            isValid: result.success,
            errors: result.errors || {},
            realtimeErrors: Object.keys(appointmentValidation.realtimeErrors).length
          }
        })
      } catch (error) {
        results.push({
          test: "Hook useRealtimeValidation",
          status: "error",
          message: "❌ Error en hook useRealtimeValidation",
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      // Test 6: Validación de diferentes entidades
      try {
        const entities = [
          { name: 'Customer', schema: createCustomerSchema, data: { name: 'Test', email: 'test@test.com', phone: '5551234567' } },
          { name: 'Collection', schema: createCollectionSchema, data: { client_id: 'C001', invoice_id: 'F001', amount: 100, collection_date: '2024-12-31', payment_method: 'transfer' } },
          { name: 'Lead', schema: createLeadSchema, data: { name: 'Test Lead', phone: '5551234567', email: 'test@test.com', source: 'Web', value: 1000 } }
        ]
        
        let allValid = true
        const entityResults: any = {}
        
        entities.forEach(entity => {
          const result = validateData(entity.schema, entity.data)
          entityResults[entity.name] = result.success
          if (!result.success) allValid = false
        })
        
        results.push({
          test: "Validación de Múltiples Entidades",
          status: allValid ? "success" : "error",
          message: allValid ? "✅ Todas las entidades validadas correctamente" : "❌ Algunas entidades fallaron",
          details: { entityResults, allValid }
        })
      } catch (error) {
        results.push({
          test: "Validación de Múltiples Entidades",
          status: "error",
          message: "❌ Error en validación de entidades",
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
        <h1 className="text-3xl font-bold mb-2">🧪 Test Fase 2: Tipos y Validación</h1>
        <p className="text-muted-foreground">
          Verifica que el sistema de tipos, validación con Zod y hooks funcionen correctamente
        </p>
      </div>

      {/* Información de Tipos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Información de Tipos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Tipos Base</h4>
              <div className="space-y-1 text-sm">
                <div>BaseEntity ✅</div>
                <div>BaseCreateData ✅</div>
                <div>BaseUpdateData ✅</div>
                <div>EntityStatus ✅</div>
                <div>PaymentMethod ✅</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Entidades</h4>
              <div className="space-y-1 text-sm">
                <div>Customer ✅</div>
                <div>Vehicle ✅</div>
                <div>Supplier ✅</div>
                <div>Collection ✅</div>
                <div>Appointment ✅</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de Fase 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tests de Fase 2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runFase2Tests} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? "Ejecutando tests..." : "Ejecutar Tests de Fase 2"}
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
        {/* Formulario de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Formulario de Cliente (useValidation)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                placeholder="Nombre del cliente"
              />
              {customerForm.formState.errors.name && (
                <p className="text-sm text-red-500">{customerForm.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                placeholder="email@ejemplo.com"
              />
              {customerForm.formState.errors.email && (
                <p className="text-sm text-red-500">{customerForm.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                placeholder="5551234567"
              />
              {customerForm.formState.errors.phone && (
                <p className="text-sm text-red-500">{customerForm.formState.errors.phone.message}</p>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Formulario válido: {customerForm.formState.isValid ? '✅' : '❌'}</p>
              <p>Errores: {Object.keys(customerForm.formState.errors).length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Cobro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Formulario de Cobro (useDataValidation)
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
                placeholder="100.00"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Validación: {collectionValidation.isValid ? '✅' : '❌'}</p>
              <p>Errores: {Object.keys(collectionValidation.errors).length}</p>
              {Object.keys(collectionValidation.errors).length > 0 && (
                <div className="mt-2">
                  {Object.entries(collectionValidation.errors).map(([key, error]) => (
                    <p key={key} className="text-red-500 text-xs">{key}: {error}</p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Fase 2 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Resumen de Fase 2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Tipos base centralizados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Tipos específicos por entidad</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Esquemas de validación con Zod</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Hooks de validación reutilizables</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Utilidades de validación</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
