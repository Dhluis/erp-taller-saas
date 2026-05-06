"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/navigation/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ClipboardList,
  Building2,
  Wallet,
  ArrowRight,
  AlertCircle,
  Plus
} from "lucide-react"

interface ComprasStats {
  totalOrders: number
  totalSuppliers: number
  totalPaid: number
  totalPending: number
}

export default function ComprasPage() {
  const [stats, setStats] = useState<ComprasStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    Promise.all([
      fetch('/api/purchase-orders?limit=1').then(r => r.json()).catch(() => null),
      fetch('/api/suppliers?limit=1').then(r => r.json()).catch(() => null),
      fetch(`/api/supplier-payments?date_from=${monthStart.toISOString().slice(0,10)}&date_to=${monthEnd.toISOString().slice(0,10)}&limit=200`).then(r => r.json()).catch(() => null),
    ]).then(([orders, suppliers, payments]) => {
      setStats({
        totalOrders: orders?.data?.pagination?.total ?? 0,
        totalSuppliers: suppliers?.data?.pagination?.total ?? 0,
        totalPaid: payments?.data?.stats?.totalPaid ?? 0,
        totalPending: payments?.data?.stats?.totalPending ?? 0,
      })
      setLoadingStats(false)
    })
  }, [])

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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
          actions={
            <Link href="/compras/ordenes/nueva">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva orden de compra
              </Button>
            </Link>
          }
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
              <CardTitle className="text-sm font-medium text-yellow-400">Órdenes de Compra</CardTitle>
              <ClipboardList className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {loadingStats ? <span className="animate-pulse">…</span> : stats?.totalOrders ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Proveedores</CardTitle>
              <Building2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {loadingStats ? <span className="animate-pulse">…</span> : stats?.totalSuppliers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Pagos del Mes</CardTitle>
              <Wallet className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {loadingStats ? <span className="animate-pulse">…</span> : fmt(stats?.totalPaid ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total pagado este mes</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-400">Pagos Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {loadingStats ? <span className="animate-pulse">…</span> : fmt(stats?.totalPending ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Por pagar este mes</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}


