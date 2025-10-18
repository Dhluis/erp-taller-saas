'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { 
  Package, 
  Tag, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Plus,
  BarChart3,
  Settings
} from 'lucide-react';

export default function InventariosPage() {
  const breadcrumbs = [
    { label: 'Inventarios', href: '/inventarios' }
  ];

  const handleNewProduct = () => {
    // Redirigir a la página de productos donde sí funciona el modal
    window.location.href = '/inventarios/productos';
  };

  return (
    <AppLayout
      title="Inventarios"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Gestión de Inventarios"
          description="Administra el inventario, categorías y movimientos del taller"
          breadcrumbs={breadcrumbs}
          actions={
            <Button onClick={handleNewProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          }
        />

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Productos en inventario</p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Categorías</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">Categorías activas</p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$8,250</div>
              <p className="text-xs text-muted-foreground">Valor del inventario</p>
            </CardContent>
          </Card>
        </div>

        {/* Secciones principales */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Productos */}
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold text-text-primary">Productos</CardTitle>
              </div>
              <p className="text-sm text-text-secondary mt-1">Gestiona el inventario de productos</p>
            </CardHeader>
            <CardContent className="p-6">
              <Link href="/inventarios/productos">
                <Button variant="default" className="w-full">
                  Ver Productos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Categorías */}
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg font-semibold text-text-primary">Categorías</CardTitle>
              </div>
              <p className="text-sm text-text-secondary mt-1">Organiza productos por categorías</p>
            </CardHeader>
            <CardContent className="p-6">
              <Link href="/inventarios/categorias">
                <Button variant="default" className="w-full">
                  Ver Categorías
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Reportes */}
          <Card className="bg-bg-secondary border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg font-semibold text-text-primary">Reportes</CardTitle>
              </div>
              <p className="text-sm text-text-secondary mt-1">Análisis de inventario y movimientos</p>
            </CardHeader>
            <CardContent className="p-6">
              <Button variant="outline" className="w-full">
                Ver Reportes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card className="bg-bg-secondary border border-border rounded-lg shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Acciones Rápidas</CardTitle>
            <p className="text-sm text-text-secondary">Gestiona tu inventario de manera eficiente</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/inventarios/productos">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Nuevo Producto</span>
                </Button>
              </Link>
              
              <Link href="/inventarios/categorias">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Tag className="h-6 w-6" />
                  <span className="text-sm font-medium">Nueva Categoría</span>
                </Button>
              </Link>
              
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm font-medium">Ajuste de Stock</span>
              </Button>
              
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Settings className="h-6 w-6" />
                <span className="text-sm font-medium">Configuración</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}




