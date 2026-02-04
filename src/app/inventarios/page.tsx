'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { 
  Package, 
  Tag, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Plus,
  BarChart3,
  Settings,
  DollarSign
} from 'lucide-react';

export default function InventariosPage() {
  const breadcrumbs = [
    { label: 'Inventarios', href: '/inventarios' }
  ];

  // ✅ Cargar datos del inventario
  const { items, categories, loading } = useInventory({
    page: 1,
    pageSize: 1000, // Cargar todos los productos para estadísticas
    autoLoad: true
  });

  // ✅ CALCULAR ESTADÍSTICAS DINÁMICAS
  const stats = useMemo(() => {
    console.log('📊 [Inventory] Calculando estadísticas...');
    console.log('  Items:', items.length);
    
    // Stock bajo: productos donde quantity <= min_quantity
    const lowStockItems = items.filter(item => {
      const isLowStock = item.quantity <= (item.min_quantity || 0);
      if (isLowStock) {
        console.log('⚠️ Stock bajo detectado:', {
          name: item.name,
          quantity: item.quantity,
          min_quantity: item.min_quantity
        });
      }
      return isLowStock;
    });
    
    // Valor total: suma de (quantity * unit_price)
    const totalValue = items.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
    );
    
    const result = {
      totalProducts: items.length,
      lowStock: lowStockItems.length,
      lowStockItems: lowStockItems, // Para mostrar detalles
      categories: categories.length,
      totalValue: totalValue
    };
    
    console.log('✅ [Inventory] Estadísticas calculadas:', result);
    return result;
  }, [items, categories]);

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
          {/* Total Productos */}
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-400">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">Productos en inventario</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Categorías */}
          <Card className="bg-green-500/10 border-green-500/20 rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Categorías</CardTitle>
              <Tag className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-400">{stats.categories}</div>
                  <p className="text-xs text-muted-foreground">Categorías activas</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stock Bajo - CON ALERTA */}
          <Card className={`bg-yellow-500/10 border-yellow-500/20 rounded-lg shadow-md ${
            stats.lowStock > 0 
              ? 'ring-2 ring-yellow-500 ring-opacity-50' 
              : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-yellow-400">
                    {stats.lowStock}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.lowStock > 0 
                      ? 'Productos con stock bajo' 
                      : 'Todo bien'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Valor Total */}
          <Card className="bg-purple-500/10 border-purple-500/20 rounded-lg shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-primary">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold animate-pulse">...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-purple-400">
                    ${stats.totalValue.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Valor del inventario</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de productos con stock bajo (si hay) */}
        {!loading && stats.lowStock > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 rounded-lg shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Productos con stock bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {stats.lowStockItems.map(item => (
                  <li key={item.id} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center justify-between p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                    <span className="font-medium">• {item.name}</span>
                    <span className="text-xs">
                      Stock: <span className="font-bold">{item.quantity}</span> / 
                      Mínimo: <span className="font-bold">{item.min_quantity}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Link href="/inventarios/productos?filter=lowStock">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Ver todos los productos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

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




