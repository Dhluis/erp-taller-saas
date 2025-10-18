// app/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Overview } from "../../components/dashboard/overview"
import { RecentOrders } from "../../components/dashboard/recent-orders"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ActiveEmployees } from "@/components/dashboard/active-employees"
import { PopularServices } from "@/components/dashboard/popular-services"
import { QuotationsMetrics } from "@/components/dashboard/quotations-metrics"
import { EfficiencyMetrics } from "@/components/dashboard/efficiency-metrics"
import { UsageLimits } from "@/components/dashboard/usage-limits"
import { 
  Car, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Wrench,
  Trophy
} from "lucide-react"

export default async function DashboardPage() {
  const { getDashboardMetrics } = await import("@/lib/supabase/dashboard-queries")
  const metrics = await getDashboardMetrics()
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="efficiency">Eficiencia</TabsTrigger>
          <TabsTrigger value="quotations">Cotizaciones</TabsTrigger>
          <TabsTrigger value="saas">SaaS</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Métricas Principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Órdenes del Mes"
              value={metrics.ordersMonth}
              change="+20.1%"
              icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Ingresos del Mes"
              value={`$${metrics.revenueMonth.toLocaleString()}`}
              change="+15%"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Clientes Activos"
              value={metrics.activeClients}
              change="+12.5%"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="Vehículos en Taller"
              value={metrics.vehiclesInShop}
              change="-5%"
              icon={<Car className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Métricas de Estado de Órdenes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.ordersPending}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.ordersInProgress}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completadas Hoy</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.ordersCompletedToday}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Bajo Stock</CardTitle>
                <Package className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.lowStockItems}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos y Tablas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Ingresos Mensuales</CardTitle>
                <CardDescription>
                  Comparación de ingresos de los últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview data={metrics.revenueChart} />
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Órdenes Recientes</CardTitle>
                <CardDescription>
                  Las últimas 5 órdenes registradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentOrders orders={metrics.recentOrders as any[]} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ActiveEmployees employees={metrics.activeEmployees} />
            <PopularServices services={metrics.popularServices} />
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <EfficiencyMetrics 
            avgCompletionTime={metrics.avgCompletionTime}
            topPerformers={metrics.topPerformers}
          />
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <QuotationsMetrics
            quotationsMonth={metrics.quotationsMonth}
            quotationsApproved={metrics.quotationsApproved}
            quotationsConverted={metrics.quotationsConverted}
            conversionRate={metrics.conversionRate}
            totalQuotationValue={metrics.totalQuotationValue}
            approvedQuotationValue={metrics.approvedQuotationValue}
          />
        </TabsContent>

        <TabsContent value="saas" className="space-y-4">
          <UsageLimits
            orders={metrics.orders}
            clients={metrics.clients}
            users={metrics.users}
            storage={metrics.storage}
            api_calls={metrics.api_calls}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Se eliminó la implementación mock local