'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  BarChart3,
  Plus,
  ArrowRight,
  Calendar,
  Users,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

interface IncomeStats {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  averageInvoiceValue: number;
}

export default function IngresosPage() {
  const router = useRouter();
  const permissions = usePermissions();
  
  // ✅ PROTECCIÓN: Solo ADMIN puede acceder a Ingresos
  useEffect(() => {
    if (!permissions.isAdmin && !permissions.canRead('invoices') && !permissions.canPayInvoices()) {
      router.push('/dashboard');
    }
  }, [permissions, router]);

  const [stats, setStats] = useState<IncomeStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    averageInvoiceValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  
  // Si no tiene permisos, no renderizar nada
  if (!permissions.isAdmin && !permissions.canRead('invoices') && !permissions.canPayInvoices()) {
    return null;
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ingresos/stats', { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setStats({
            totalRevenue: d.totalRevenue ?? d.total_cobrado ?? 0,
            monthlyRevenue: d.monthlyRevenue ?? d.ingresos_este_mes ?? 0,
            pendingInvoices: d.pendingInvoices ?? d.facturas_pendientes ?? 0,
            paidInvoices: d.paidInvoices ?? d.facturas_pagadas ?? 0,
            overdueInvoices: d.overdueInvoices ?? d.facturas_vencidas ?? 0,
            averageInvoiceValue: d.averageInvoiceValue ?? 0,
          });
        }
      } catch (e) {
        console.error('Error loading income stats:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const breadcrumbs = [
    { label: 'Ingresos', href: '/ingresos' },
  ];

  if (loading) {
    return (
      <AppLayout
        title="Ingresos"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8 p-6">
          <PageHeader
            title="Gestión de Ingresos"
            description="Administra las facturas, cobros y reportes financieros"
            breadcrumbs={breadcrumbs}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse bg-bg-secondary border border-border">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Ingresos"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8 p-6">
        <PageHeader
          title="Gestión de Ingresos"
          description="Administra las facturas, cobros y reportes financieros"
          breadcrumbs={breadcrumbs}
          actions={
            <div className="flex gap-2">
              <Link href="/ingresos/facturacion">
                <Button className="text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Factura
                </Button>
              </Link>
              <Link href="/ingresos/cobros">
                <Button variant="outline" className="text-white">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Registrar Cobro
                </Button>
              </Link>
            </div>
          }
        />

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Acumulado del año</p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Ingresos del Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Facturas Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">Por cobrar</p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Valor Promedio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-text-primary">${stats.averageInvoiceValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Por factura</p>
            </CardContent>
          </Card>
        </div>

        {/* Estado de facturas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-text-primary flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-green-600" />
                Facturas Pagadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.paidInvoices}</div>
              <p className="text-sm text-text-secondary">Total facturas pagadas</p>
              <Badge variant="success" className="mt-2">Al día</Badge>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-text-primary flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-yellow-600" />
                Facturas Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pendingInvoices}</div>
              <p className="text-sm text-text-secondary">Esperando pago</p>
              <Badge variant="warning" className="mt-2">Pendiente</Badge>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-text-primary flex items-center">
                <Users className="h-5 w-5 mr-2 text-red-600" />
                Facturas Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 mb-2">{stats.overdueInvoices}</div>
              <p className="text-sm text-text-secondary">Requieren seguimiento</p>
              <Badge variant="error" className="mt-2">Vencidas</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-text-primary">Facturación</h3>
              </div>
              <p className="text-sm text-text-secondary mt-1">Crea y gestiona facturas</p>
            </CardHeader>
            <CardContent className="p-6">
              <Link href="/ingresos/facturacion">
                <Button className="w-full text-white">
                  Gestionar Facturas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-text-primary">Cobros</h3>
              </div>
              <p className="text-sm text-text-secondary mt-1">Registra pagos recibidos</p>
            </CardHeader>
            <CardContent className="p-6">
              <Link href="/ingresos/cobros">
                <Button className="w-full text-white">
                  Gestionar Cobros
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-text-primary">Reportes</h3>
              </div>
              <p className="text-sm text-text-secondary mt-1">Análisis financiero</p>
            </CardHeader>
            <CardContent className="p-6">
              <Link href="/ingresos/reportes">
                <Button className="w-full text-white">
                  Ver Reportes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas adicionales */}
        <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
          <CardHeader className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-text-primary">Acciones Rápidas</h3>
            <p className="text-sm text-text-secondary">Gestiona tus ingresos de manera eficiente</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/ingresos/facturacion">
                <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Nueva Factura</span>
                </Button>
              </Link>
              <Link href="/ingresos/cobros">
                <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm font-medium">Registrar Cobro</span>
                </Button>
              </Link>
              <Link href="/ingresos/reportes">
                <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm font-medium">Reportes</span>
                </Button>
              </Link>
              <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm font-medium">Análisis</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}




