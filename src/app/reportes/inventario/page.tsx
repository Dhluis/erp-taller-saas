"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  AlertTriangle,
  DollarSign,
  Download,
  Calendar,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Percent,
  ShoppingCart
} from "lucide-react"

interface MarginItem { name: string; sku?: string | null; purchase_price: number; unit_price: number; margin_pct: number; margin_per_unit?: number; potential_profit?: number }
interface ReportState {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  totalCost: number
  grossProfit: number
  avgMarginPct: number
  itemsWithCost: number
  itemsWithoutCost: number
  categories: Array<{ name: string; count: number; value: number }>
  lowStockItems: Array<{ id?: string; name: string; current_stock: number; min_stock: number; category?: string }>
  marginsAnalysis: {
    lowMarginItems: MarginItem[]
    highMarginItems: MarginItem[]
    noCostItems: Array<{ name: string; sku?: string | null; unit_price: number }>
  }
}

export default function ReportesInventarioPage() {
  const [report, setReport] = useState<ReportState>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalValue: 0,
    totalCost: 0,
    grossProfit: 0,
    avgMarginPct: 0,
    itemsWithCost: 0,
    itemsWithoutCost: 0,
    categories: [],
    lowStockItems: [],
    marginsAnalysis: { lowMarginItems: [], highMarginItems: [], noCostItems: [] }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("this_month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    loadReport()
  }, [selectedPeriod])

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  const loadReport = async () => {
    if (selectedPeriod === 'custom' && (!customStart || !customEnd)) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/reports/inventory')
      const json = await res.json()
      const data = json.data
      if (!res.ok || !data) {
        setReport({ totalProducts: 0, lowStockProducts: 0, totalValue: 0, totalCost: 0, grossProfit: 0, avgMarginPct: 0, itemsWithCost: 0, itemsWithoutCost: 0, categories: [], lowStockItems: [], marginsAnalysis: { lowMarginItems: [], highMarginItems: [], noCostItems: [] } })
        return
      }
      const ma = data.margins_analysis ?? {}
      setReport({
        totalProducts: data.summary?.total_products ?? 0,
        lowStockProducts: data.summary?.low_stock_count ?? 0,
        totalValue: data.summary?.total_value ?? 0,
        totalCost: data.summary?.total_cost ?? 0,
        grossProfit: data.summary?.gross_profit ?? 0,
        avgMarginPct: data.summary?.avg_margin_pct ?? 0,
        itemsWithCost: data.summary?.items_with_cost ?? 0,
        itemsWithoutCost: data.summary?.items_without_cost ?? 0,
        categories: (data.categories_breakdown ?? []).map((c: { category: string; count: number; value: number }) => ({
          name: c.category,
          count: c.count,
          value: c.value
        })),
        lowStockItems: (data.low_stock_products ?? []).map((p: { id?: string; name?: string; current_stock?: number; min_stock?: number; category?: string }) => ({
          id: p.id,
          name: p.name ?? '-',
          current_stock: p.current_stock ?? 0,
          min_stock: p.min_stock ?? 0,
          category: p.category
        })),
        marginsAnalysis: {
          lowMarginItems: ma.low_margin_items ?? [],
          highMarginItems: ma.high_margin_items ?? [],
          noCostItems: ma.items_without_cost ?? [],
        }
      })
    } catch (error) {
      console.error('Error cargando reporte de inventario:', error)
      setReport({ totalProducts: 0, lowStockProducts: 0, totalValue: 0, totalCost: 0, grossProfit: 0, avgMarginPct: 0, itemsWithCost: 0, itemsWithoutCost: 0, categories: [], lowStockItems: [], marginsAnalysis: { lowMarginItems: [], highMarginItems: [], noCostItems: [] } })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Breadcrumbs */}
        <StandardBreadcrumbs 
          currentPage="Inventario"
          parentPages={[{ label: 'Reportes', href: '/reportes' }]}
        />
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando reporte de inventario...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Inventario"
        parentPages={[{ label: 'Reportes', href: '/reportes' }]}
      />
      
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reportes de Inventario</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes pasado</SelectItem>
              <SelectItem value="this_quarter">Este trimestre</SelectItem>
              <SelectItem value="this_year">Este año</SelectItem>
              <SelectItem value="last_year">Año pasado</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {selectedPeriod === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[160px]" />
          <span className="text-muted-foreground text-sm">—</span>
          <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[160px]" />
          <Button variant="outline" size="sm" onClick={loadReport} disabled={!customStart || !customEnd}>Aplicar</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{report.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{report.itemsWithCost} con costo configurado</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{report.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Necesitan reposición</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Utilidad Potencial</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">${(report.grossProfit || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Sobre stock con costo configurado</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">Margen Promedio</CardTitle>
            <Percent className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{report.avgMarginPct}%</div>
            <p className="text-xs text-muted-foreground">
              {report.itemsWithoutCost > 0
                ? <span className="text-amber-400">{report.itemsWithoutCost} sin costo</span>
                : 'Todos con costo configurado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.lowStockItems.length > 0 ? (
                report.lowStockItems.map((item, index) => (
                  <div key={item.id ?? index} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-700">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-500 text-white">
                        {item.current_stock}/{item.min_stock}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay productos con stock bajo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Inventario por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-700">{category.count} productos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${(category.value || 0).toLocaleString()}</p>
                    <p className="text-sm text-gray-700">Valor total</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análisis de Márgenes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Mayor Margen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.marginsAnalysis.highMarginItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Configura el costo de compra en tus productos para ver márgenes</p>
            ) : (
              <div className="space-y-2">
                {report.marginsAnalysis.highMarginItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.purchase_price} → ${item.unit_price}</p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0 ml-2">
                      +{item.margin_pct}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              Menor Margen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.marginsAnalysis.lowMarginItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos de margen aún</p>
            ) : (
              <div className="space-y-2">
                {report.marginsAnalysis.lowMarginItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.purchase_price} → ${item.unit_price}</p>
                    </div>
                    <Badge className={`shrink-0 ml-2 ${item.margin_pct < 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                      {item.margin_pct >= 0 ? '+' : ''}{item.margin_pct}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sin costo configurado */}
      {report.marginsAnalysis.noCostItems.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <ShoppingCart className="h-5 w-5" />
              Sin Costo de Compra ({report.itemsWithoutCost} productos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Estos productos no tienen precio de compra — el anticipo automático no puede calcularse para ellos.
              Agrégalo en <strong>Inventario → editar producto → Costo de Compra</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              {report.marginsAnalysis.noCostItems.map((item, i) => (
                <Badge key={i} className="border-amber-500/40 text-amber-400 bg-amber-500/10">
                  {item.name}
                </Badge>
              ))}
              {report.itemsWithoutCost > report.marginsAnalysis.noCostItems.length && (
                <Badge className="border-gray-500/40 text-gray-400">
                  +{report.itemsWithoutCost - report.marginsAnalysis.noCostItems.length} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen financiero del inventario */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero del Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{report.totalProducts}</div>
              <div className="text-sm text-muted-foreground">Productos</div>
            </div>
            <div className="text-center p-4 bg-slate-500/10 rounded-lg border border-slate-500/20">
              <div className="text-2xl font-bold text-slate-300">${(report.totalCost || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">Costo del stock</div>
            </div>
            <div className="text-center p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <div className="text-2xl font-bold text-cyan-400">${(report.totalValue || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">Valor de venta</div>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">${(report.grossProfit || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">Utilidad bruta potencial</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
