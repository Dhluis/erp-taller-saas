"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/navigation/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  ClipboardList, 
  Building2, 
  Wallet,
  ArrowRight
} from "lucide-react"

export default function ComprasPage() {
  return (
    <AppLayout
      title="Gestión de Compras"
      breadcrumbs={[{ label: 'Compras', href: '/compras' }]}
    >
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Page Header con Breadcrumbs */}
        <PageHeader
          title="Gestión de Compras"
          description="Administra las compras, proveedores y pagos del taller"
          breadcrumbs={[
            { label: 'Compras', href: '/compras' }
          ]}
        />

        {/* Cards de navegación */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <CardTitle>Órdenes de Compra</CardTitle>
              </div>
              <CardDescription>
                Gestiona las órdenes de compra de productos y servicios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/compras/ordenes">
                <Button variant="outline" className="w-full">
                  Ver Órdenes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <CardTitle>Proveedores</CardTitle>
              </div>
              <CardDescription>
                Administra el directorio de proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/proveedores">
                <Button variant="outline" className="w-full">
                  Ver Proveedores
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-purple-600" />
                <CardTitle>Pagos</CardTitle>
              </div>
              <CardDescription>
                Gestiona los pagos a proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/compras/pagos">
                <Button variant="outline" className="w-full">
                  Ver Pagos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400">Órdenes Pendientes</CardTitle>
              <ClipboardList className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">12</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Proveedores Activos</CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">8</div>
              <p className="text-xs text-muted-foreground">
                Con órdenes recientes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Pagos del Mes</CardTitle>
              <Wallet className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">$24,500</div>
              <p className="text-xs text-muted-foreground">
                Total pagado este mes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-400">Ahorro del Mes</CardTitle>
              <ArrowRight className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">$2,300</div>
              <p className="text-xs text-muted-foreground">
                Por negociaciones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}


