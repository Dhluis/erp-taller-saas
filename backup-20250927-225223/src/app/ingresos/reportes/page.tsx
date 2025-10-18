"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Download, 
  Search, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  FileText,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Loader2,
  CheckCircle
} from "lucide-react"

interface ReportData {
  id: string
  date: string
  type: string
  description: string
  amount: number
  status: string
  category: string
}

export default function ReportesPage() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Datos de ejemplo
  useEffect(() => {
    const mockReports: ReportData[] = [
      {
        id: "1",
        date: "2024-01-15",
        type: "Venta",
        description: "Servicio de mantenimiento - Cliente ABC",
        amount: 2500,
        status: "completado",
        category: "Servicios"
      },
      {
        id: "2",
        date: "2024-01-14",
        type: "Venta",
        description: "Cambio de aceite - Cliente XYZ",
        amount: 800,
        status: "completado",
        category: "Servicios"
      },
      {
        id: "3",
        date: "2024-01-13",
        type: "Compra",
        description: "Refacciones para inventario",
        amount: 1200,
        status: "pendiente",
        category: "Inventario"
      },
      {
        id: "4",
        date: "2024-01-12",
        type: "Venta",
        description: "Reparación de frenos - Cliente DEF",
        amount: 1800,
        status: "completado",
        category: "Servicios"
      }
    ]
    
    setReports(mockReports)
    setIsLoading(false)
  }, [])

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || report.type === filterType
    return matchesSearch && matchesType
  })

  const stats = {
    totalRevenue: reports.filter(r => r.type === "Venta" && r.status === "completado").reduce((sum, r) => sum + r.amount, 0),
    totalExpenses: reports.filter(r => r.type === "Compra").reduce((sum, r) => sum + r.amount, 0),
    pendingAmount: reports.filter(r => r.status === "pendiente").reduce((sum, r) => sum + r.amount, 0),
    completedTransactions: reports.filter(r => r.status === "completado").length
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      completado: { label: "Completado", className: "bg-green-500" },
      pendiente: { label: "Pendiente", className: "bg-yellow-500" },
      cancelado: { label: "Cancelado", className: "bg-red-500" }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-500" }
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeMap = {
      Venta: { label: "Venta", className: "bg-blue-500" },
      Compra: { label: "Compra", className: "bg-orange-500" },
      Gasto: { label: "Gasto", className: "bg-red-500" }
    }
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, className: "bg-gray-500" }
    return <Badge className={typeInfo.className}>{typeInfo.label}</Badge>
  }

  // Función para exportar datos a CSV
  const handleExportCSV = async () => {
    setIsExporting(true)
    setExportSuccess(false)
    
    try {
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const csvContent = [
        ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Estado', 'Categoría'],
        ...filteredReports.map(report => [
          report.date,
          report.type,
          report.description,
          report.amount.toString(),
          report.status,
          report.category
        ])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `reportes_ingresos_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error al exportar el archivo')
    } finally {
      setIsExporting(false)
    }
  }

  // Función para generar reporte con gráficos
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    
    try {
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setShowReportModal(true)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar el reporte')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Función para exportar a Excel (simulada)
  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportSuccess(false)
    
    try {
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      // En una implementación real, aquí se usaría una librería como xlsx
      alert('Funcionalidad de Excel en desarrollo. Por ahora se descarga como CSV.')
      handleExportCSV()
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Error al exportar el archivo')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando reportes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={isExporting}
            className={exportSuccess ? "bg-green-50 border-green-200" : ""}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                ¡Exportado!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            {isGeneratingReport ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generar Reporte
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {reports.filter(r => r.status === "pendiente").length} transacciones
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Transacciones completadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Venta">Ventas</SelectItem>
                  <SelectItem value="Compra">Compras</SelectItem>
                  <SelectItem value="Gasto">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateRange">Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export">Exportar</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
          <CardDescription>
            Lista de todas las transacciones del período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Categoría</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(report.date).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(report.type)}</TableCell>
                  <TableCell className="font-medium">{report.description}</TableCell>
                  <TableCell>
                    <span className="font-medium">${report.amount.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.category}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredReports.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron transacciones</h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros para ver más resultados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Reporte Generado */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reporte de Ingresos Generado
            </DialogTitle>
            <DialogDescription>
              Análisis detallado de ingresos y gastos del período seleccionado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen Ejecutivo */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Ingresos Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">${stats.totalExpenses.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Gastos Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">${(stats.totalRevenue - stats.totalExpenses).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Beneficio Neto</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.completedTransactions}</div>
                    <div className="text-sm text-muted-foreground">Transacciones</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Ingresos vs Gastos */}
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs Gastos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="font-medium">Ventas</span>
                    </div>
                    <span className="font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="font-medium">Compras</span>
                    </div>
                    <span className="font-bold text-red-600">${stats.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="font-medium">Pendientes</span>
                    </div>
                    <span className="font-bold text-yellow-600">${stats.pendingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Análisis de Categorías */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Servicios', 'Inventario', 'Mantenimiento'].map((category, index) => {
                    const categoryReports = filteredReports.filter(r => r.category === category)
                    const categoryTotal = categoryReports.reduce((sum, r) => sum + r.amount, 0)
                    const percentage = stats.totalRevenue > 0 ? (categoryTotal / stats.totalRevenue) * 100 : 0
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                          <span className="font-medium">{category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${categoryTotal.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recomendaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Optimización de Ingresos</div>
                      <div className="text-sm text-blue-700">Considera aumentar los precios de servicios con mayor demanda</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-900">Control de Gastos</div>
                      <div className="text-sm text-green-700">Revisa los gastos de inventario para optimizar costos</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-900">Seguimiento</div>
                      <div className="text-sm text-yellow-700">Monitorea las transacciones pendientes para mejorar el flujo de caja</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              Cerrar
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

