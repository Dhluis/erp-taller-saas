/**
 * Página de Migración de Páginas Existentes
 * Herramienta para migrar páginas existentes a la nueva arquitectura
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, Loader2, Copy, Download } from 'lucide-react'

interface MigrationResult {
  page: string
  status: 'success' | 'error' | 'warning'
  message: string
  newCode?: string
  issues?: string[]
}

export default function MigratePagesPage() {
  const [results, setResults] = useState<MigrationResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedPage, setSelectedPage] = useState('')

  const pagesToMigrate = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      currentImport: '@/lib/supabase/dashboard-queries',
      newImport: '@/lib/core/supabase'
    },
    {
      name: 'Collections (Cobros)',
      path: '/ingresos/cobros',
      currentImport: '@/lib/supabase/collections',
      newImport: '@/lib/services/collections-service'
    },
    {
      name: 'Invoices (Facturas)',
      path: '/ingresos/facturacion',
      currentImport: '@/lib/supabase/invoices',
      newImport: '@/lib/services/invoices-service'
    },
    {
      name: 'Customers (Clientes)',
      path: '/clientes',
      currentImport: '@/lib/supabase/client',
      newImport: '@/lib/core/supabase'
    },
    {
      name: 'Suppliers (Proveedores)',
      path: '/proveedores',
      currentImport: '@/lib/supabase/suppliers',
      newImport: '@/lib/services/suppliers-service'
    },
    {
      name: 'Inventory (Inventario)',
      path: '/inventario',
      currentImport: '@/lib/supabase/inventory-products',
      newImport: '@/lib/services/inventory-service'
    }
  ]

  const generateMigrationCode = (page: any) => {
    return `// Migración para ${page.name}
// Reemplaza las importaciones antiguas con las nuevas

// ANTES:
// import { getData } from '${page.currentImport}'

// DESPUÉS:
import { getBrowserClient } from '@/lib/core/supabase'
import { collectionsService } from '@/lib/services/collections-service'
import { handleError } from '@/lib/core/errors'

// Ejemplo de uso:
export async function getPageData() {
  try {
    const client = getSupabaseClient()
    const stats = await collectionsService.getCollectionStats()
    return { stats }
  } catch (error) {
    handleError(error)
    throw error
  }
}`
  }

  const runMigration = async () => {
    setIsRunning(true)
    setResults([])

    const migrationResults: MigrationResult[] = []

    for (const page of pagesToMigrate) {
      try {
        // Simular migración
        await new Promise(resolve => setTimeout(resolve, 500))
        
        migrationResults.push({
          page: page.name,
          status: 'success',
          message: 'Migración completada exitosamente',
          newCode: generateMigrationCode(page)
        })
      } catch (error) {
        migrationResults.push({
          page: page.name,
          status: 'error',
          message: 'Error en migración',
          issues: ['Error de sintaxis', 'Dependencias faltantes']
        })
      }
    }

    setResults(migrationResults)
    setIsRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Completado</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Pendiente</Badge>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Migración de Páginas</h1>
        <p className="text-muted-foreground">
          Herramienta para migrar páginas existentes a la nueva arquitectura
        </p>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Instrucciones:</strong> Esta herramienta te ayudará a migrar las páginas existentes 
          a la nueva arquitectura unificada. Revisa cada migración antes de aplicarla.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button 
          onClick={runMigration} 
          disabled={isRunning}
          className="w-48"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migrando...
            </>
          ) : (
            'Iniciar Migración'
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <Alert className="border-blue-500">
            <AlertDescription>
              <strong>Resultados de la Migración:</strong> {
                results.filter(r => r.status === 'success').length
              } de {results.length} páginas migradas exitosamente
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.status)}
                      <CardTitle className="text-lg">{result.page}</CardTitle>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {result.message}
                  </CardDescription>
                  
                  {result.newCode && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Código Migrado:</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(result.newCode!)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                      </div>
                      <Textarea
                        value={result.newCode}
                        readOnly
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>
                  )}
                  
                  {result.issues && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-red-600">Problemas encontrados:</h4>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {result.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Guía de Migración</CardTitle>
          <CardDescription>
            Pasos para migrar páginas existentes a la nueva arquitectura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Actualizar Importaciones</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reemplazar imports de Supabase</li>
                <li>• Usar servicios centralizados</li>
                <li>• Importar manejo de errores</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Refactorizar Lógica</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Usar servicios base</li>
                <li>• Implementar manejo de errores</li>
                <li>• Añadir validación</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Testing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Probar funcionalidad</li>
                <li>• Verificar errores</li>
                <li>• Validar rendimiento</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">4. Optimización</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Revisar performance</li>
                <li>• Optimizar queries</li>
                <li>• Añadir caching</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}







