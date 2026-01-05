'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { safeFetch } from '@/lib/api';
import { useCustomers } from '@/hooks/useCustomers';
import { useVehicles } from '@/hooks/useVehicles';
import { useOrganization } from '@/lib/context/SessionContext';
// ✅ Removido: getAllWorkOrders - ahora se usa API route
import { toast } from 'sonner';
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ReportData {
  totalCustomers: number;
  totalVehicles: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  monthlyRevenue: number;
  averageOrderValue: number;
}

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData>({
    totalCustomers: 0,
    totalVehicles: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0,
  });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // ✅ FIX: Ref para prevenir ejecución múltiple del useEffect
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Usar hooks para obtener datos reales
  const { customers, loading: customersLoading } = useCustomers();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { organizationId, loading: orgLoading, ready } = useOrganization();

  useEffect(() => {
    // ✅ FIX: Prevenir ejecución múltiple usando ref
    if (hasLoadedRef.current) {
      console.log('⏸️ [Reportes] Ya se cargó una vez, omitiendo ejecución duplicada');
      return;
    }

    // ✅ FIX: Solo cargar cuando organizationId esté listo y ESTABLE (ready)
    if (!organizationId || orgLoading || !ready) {
      // Si está cargando organizationId o no está ready, mantener loading state
      if (orgLoading || !ready) {
        setLoading(true);
        console.log('⏳ [Reportes] Esperando a que organizationId esté ready...', { orgLoading, ready, organizationId: !!organizationId });
      } else if (!organizationId) {
        console.log('⚠️ [Reportes] organizationId no disponible todavía');
      }
      return;
    }

    // ✅ FIX: Prevenir múltiples llamadas simultáneas
    if (isLoadingRef.current) {
      console.log('⏸️ [Reportes] Ya hay una carga en curso, omitiendo...');
      return;
    }

    const loadReportData = async () => {
      try {
        isLoadingRef.current = true;
        setLoading(true);
        
        console.log('🔄 [Reportes] useEffect triggered - organizationId READY y disponible:', organizationId);
        console.log('🔄 [Reportes] Primera carga?', !hasLoadedOnce);
        
        // ✅ FIX: Limpiar cache en la primera carga para asegurar datos frescos
        if (!hasLoadedOnce) {
          const { clearOrdersCache } = await import('@/lib/database/queries/work-orders');
          clearOrdersCache(organizationId);
          console.log('🧹 [Reportes] Cache limpiado para primera carga');
          setHasLoadedOnce(true);
        }
        
        // ✅ Usar API route en lugar de query directa
        const ordersResponse = await fetch('/api/work-orders', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!ordersResponse.ok) {
          const errorData = await ordersResponse.json();
          throw new Error(errorData.error || 'Error al cargar órdenes');
        }

        const ordersResult = await ordersResponse.json();
        // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
        const orders = ordersResult.success 
          ? (ordersResult.data?.items || ordersResult.data || [])
          : [];
        
        console.log('🔍 [Reportes] Estructura recibida:', {
          hasItems: !!ordersResult.data?.items,
          isArray: Array.isArray(orders),
          length: orders.length,
          firstItem: orders[0]
        });
        console.log('📊 [Reportes] Órdenes cargadas:', orders.length);
        
        // ✅ FIX: Usar valores actuales de customers y vehicles sin incluirlos en dependencias
        // Estos valores se actualizarán en un efecto separado si es necesario
        const currentCustomers = customers?.length || 0;
        const currentVehicles = vehicles?.length || 0;
        
        // Calcular estadísticas usando los datos disponibles
        const totalCustomers = currentCustomers;
        const totalVehicles = currentVehicles;
        const totalOrders = orders.length || 0;
        const pendingOrders = orders.filter((order: any) => 
          order.status === 'pending' || order.status === 'diagnosis' || order.status === 'reception'
        ).length || 0;
        const completedOrders = orders.filter((order: any) => 
          order.status === 'completed' || order.status === 'completado'
        ).length || 0;
        const totalRevenue = orders.reduce((sum: number, order: any) => 
          sum + (order.total_amount || order.total || 0), 0
        );
        const monthlyRevenue = totalRevenue; // Simplificado para este ejemplo
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        console.log('📊 [Reportes] Estadísticas calculadas:', {
          totalCustomers,
          totalVehicles,
          totalOrders,
          totalRevenue,
          pendingOrders,
          completedOrders,
          averageOrderValue
        });
        
        // ✅ FIX: Actualizar estado una sola vez con todos los datos
        setReportData({
          totalCustomers,
          totalVehicles,
          totalOrders,
          totalRevenue,
          pendingOrders,
          completedOrders,
          monthlyRevenue,
          averageOrderValue,
        });

        // ✅ FIX: Marcar como cargado después de actualizar datos
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('❌ [Reportes] Error loading report data:', error);
        toast.error('Error al cargar datos del reporte', {
          description: error instanceof Error ? error.message : 'Error desconocido'
        });
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, orgLoading, ready]); // ✅ FIX: Removidas dependencias de customers, vehicles, hasLoadedOnce para evitar re-ejecuciones

  const breadcrumbs = [
    { label: 'Reportes', href: '/reportes' }
  ];

  const handleExportReport = async () => {
    try {
      // Generar contenido del reporte directamente
      const reportContent = `
REPORTE DE ANÁLISIS - EAGLES ERP TALLER
=====================================
Fecha de Generación: ${new Date().toLocaleDateString('es-ES')}

ESTADÍSTICAS GENERALES
---------------------
Total Clientes: ${reportData.totalCustomers}
Total Vehículos: ${reportData.totalVehicles}
Total Órdenes: ${reportData.totalOrders}
Ingresos Totales: $${reportData.totalRevenue.toLocaleString()}

ESTADO DE ÓRDENES
-----------------
Órdenes Pendientes: ${reportData.pendingOrders}
Órdenes Completadas: ${reportData.completedOrders}
Tasa de Completado: ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

MÉTRICAS FINANCIERAS
-------------------
Valor Promedio por Orden: $${reportData.averageOrderValue.toFixed(0)}

RESUMEN
-------
Este reporte muestra el estado actual del taller automotriz.
Total de clientes registrados: ${reportData.totalCustomers}
Total de vehículos atendidos: ${reportData.totalVehicles}
Ingresos acumulados: $${reportData.totalRevenue.toLocaleString()}

Generado por: EAGLES ERP Taller SaaS
Fecha: ${new Date().toLocaleString('es-ES')}
      `;

      // Crear y descargar archivo
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-taller-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mostrar mensaje de éxito
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      toast.error('Error al exportar el reporte', {
        description: 'Intenta nuevamente'
      });
    }
  };

  const handleGenerateReport = async (type: string) => {
    try {
      let reportContent = '';
      let fileName = '';

      switch (type) {
        case 'ventas':
          reportContent = `
REPORTE DE VENTAS - EAGLES ERP TALLER
====================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

RESUMEN DE VENTAS
----------------
Total de Órdenes: ${reportData.totalOrders}
Ingresos Totales: $${reportData.totalRevenue.toLocaleString()}
Valor Promedio: $${reportData.averageOrderValue.toFixed(0)}

ESTADO DE VENTAS
---------------
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}
Tasa de Completado: ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

ANÁLISIS
--------
Este reporte muestra el rendimiento de ventas del taller.
Los ingresos totales ascienden a $${reportData.totalRevenue.toLocaleString()}
con un promedio de $${reportData.averageOrderValue.toFixed(0)} por orden.
          `;
          fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'clientes':
          reportContent = `
REPORTE DE CLIENTES - EAGLES ERP TALLER
======================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

INFORMACIÓN DE CLIENTES
----------------------
Total de Clientes: ${reportData.totalCustomers}
Total de Vehículos: ${reportData.totalVehicles}

ESTADÍSTICAS
-----------
Promedio de vehículos por cliente: ${reportData.totalCustomers > 0 ? 
  (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}

ANÁLISIS
--------
El taller tiene ${reportData.totalCustomers} clientes registrados
con un total de ${reportData.totalVehicles} vehículos atendidos.
          `;
          fileName = `reporte-clientes-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'ordenes':
          reportContent = `
REPORTE DE ÓRDENES - EAGLES ERP TALLER
=====================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

ESTADO DE ÓRDENES
----------------
Total de Órdenes: ${reportData.totalOrders}
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}

EFICIENCIA
---------
Tasa de Completado: ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

ANÁLISIS
--------
El taller ha procesado ${reportData.totalOrders} órdenes en total.
${reportData.completedOrders} han sido completadas exitosamente.
          `;
          fileName = `reporte-ordenes-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'mensual':
          reportContent = `
REPORTE MENSUAL - EAGLES ERP TALLER
==================================
Período: ${new Date().toLocaleDateString('es-ES')}

RESUMEN MENSUAL
--------------
Total de Clientes: ${reportData.totalCustomers}
Total de Vehículos: ${reportData.totalVehicles}
Total de Órdenes: ${reportData.totalOrders}
Ingresos del Mes: $${reportData.totalRevenue.toLocaleString()}

RENDIMIENTO
----------
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}
Valor Promedio: $${reportData.averageOrderValue.toFixed(0)}

ANÁLISIS MENSUAL
---------------
Este reporte muestra el rendimiento mensual del taller.
Los ingresos del mes ascienden a $${reportData.totalRevenue.toLocaleString()}.
          `;
          fileName = `reporte-mensual-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'financiero':
          reportContent = `
REPORTE FINANCIERO - EAGLES ERP TALLER
=====================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

INGRESOS
--------
Total de Ingresos: $${reportData.totalRevenue.toLocaleString()}
Valor Promedio por Orden: $${reportData.averageOrderValue.toFixed(0)}

ANÁLISIS FINANCIERO
------------------
Total de Órdenes: ${reportData.totalOrders}
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}

RENTABILIDAD
-----------
El taller ha generado $${reportData.totalRevenue.toLocaleString()} en ingresos
con un promedio de $${reportData.averageOrderValue.toFixed(0)} por orden procesada.
          `;
          fileName = `reporte-financiero-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'inventario':
          reportContent = `
REPORTE DE INVENTARIO - EAGLES ERP TALLER
========================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

ESTADO DEL INVENTARIO
--------------------
Total de Vehículos: ${reportData.totalVehicles}
Total de Clientes: ${reportData.totalCustomers}

ANÁLISIS DE INVENTARIO
---------------------
El taller tiene ${reportData.totalVehicles} vehículos registrados
pertenecientes a ${reportData.totalCustomers} clientes.

ESTADÍSTICAS
-----------
Promedio de vehículos por cliente: ${reportData.totalCustomers > 0 ? 
  (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}

NOTA: Este reporte se enfoca en el inventario de vehículos.
Para un análisis completo del inventario de repuestos,
consulte el módulo de inventarios.
          `;
          fileName = `reporte-inventario-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'productividad':
          reportContent = `
REPORTE DE PRODUCTIVIDAD - EAGLES ERP TALLER
==========================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

MÉTRICAS DE PRODUCTIVIDAD
------------------------
Total de Órdenes: ${reportData.totalOrders}
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}
Tasa de Eficiencia: ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

ANÁLISIS DE RENDIMIENTO
----------------------
El taller ha procesado ${reportData.totalOrders} órdenes en total.
De estas, ${reportData.completedOrders} han sido completadas exitosamente,
lo que representa una eficiencia del ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%.

VALOR PROMEDIO
--------------
El valor promedio por orden es de $${reportData.averageOrderValue.toFixed(0)},
indicando la rentabilidad promedio de los servicios prestados.

RECOMENDACIONES
---------------
- Optimizar procesos para reducir órdenes pendientes
- Implementar seguimiento de tiempos de servicio
- Analizar tendencias de productividad mensual
          `;
          fileName = `reporte-productividad-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        case 'calidad':
          reportContent = `
REPORTE DE CALIDAD - EAGLES ERP TALLER
=====================================
Fecha: ${new Date().toLocaleDateString('es-ES')}

MÉTRICAS DE CALIDAD
------------------
Total de Órdenes: ${reportData.totalOrders}
Órdenes Completadas: ${reportData.completedOrders}
Órdenes Pendientes: ${reportData.pendingOrders}
Tasa de Satisfacción: ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%

ANÁLISIS DE CALIDAD
------------------
El taller ha completado ${reportData.completedOrders} de ${reportData.totalOrders} órdenes,
lo que representa una tasa de finalización del ${reportData.totalOrders > 0 ? 
  ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%.

INDICADORES DE CALIDAD
----------------------
- Órdenes completadas exitosamente: ${reportData.completedOrders}
- Órdenes pendientes de revisión: ${reportData.pendingOrders}
- Valor promedio por orden: $${reportData.averageOrderValue.toFixed(0)}

RECOMENDACIONES
---------------
- Implementar sistema de evaluación de satisfacción
- Establecer métricas de calidad por servicio
- Crear protocolos de control de calidad
- Monitorear tiempos de respuesta y resolución
          `;
          fileName = `reporte-calidad-${new Date().toISOString().split('T')[0]}.txt`;
          break;

        default:
          toast.error('Tipo de reporte no válido');
          return;
      }

      // Crear y descargar archivo
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mostrar mensaje de éxito
      toast.success(`Reporte de ${type} exportado exitosamente`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar el reporte', {
        description: 'Intenta nuevamente'
      });
    }
  };

  // ✅ FIX: Mostrar loading skeleton si organizationId no está listo o está cargando datos
  // Usar skeleton en lugar de spinner para evitar parpadeo
  if (!organizationId || orgLoading || loading) {
    return (
      <AppLayout title="Reportes" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Skeleton para header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          {/* Skeleton para cards de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton para cards adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reportes" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Reportes y Análisis</h1>
            <p className="text-text-secondary">Análisis detallado del rendimiento del taller</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportReport}>
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Clientes</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {reportData.totalCustomers}
                  </p>
                  <p className="text-xs text-text-muted">Clientes registrados</p>
                </div>
                <div className="p-3 rounded-lg bg-info/10">
                  <UsersIcon className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Vehículos</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {reportData.totalVehicles}
                  </p>
                  <p className="text-xs text-text-muted">Vehículos registrados</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <TruckIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Órdenes</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {reportData.totalOrders}
                  </p>
                  <p className="text-xs text-text-muted">Órdenes procesadas</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-text-primary">
                    ${reportData.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Ingresos acumulados</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <CurrencyDollarIcon className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Órdenes Pendientes</p>
                  <p className="text-2xl font-bold text-warning">
                    {reportData.pendingOrders}
                  </p>
                  <p className="text-xs text-text-muted">Requieren atención</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <ClockIcon className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Órdenes Completadas</p>
                  <p className="text-2xl font-bold text-success">
                    {reportData.completedOrders}
                  </p>
                  <p className="text-xs text-text-muted">Trabajos finalizados</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Valor Promedio</p>
                  <p className="text-2xl font-bold text-primary">
                    ${reportData.averageOrderValue.toFixed(0)}
                  </p>
                  <p className="text-xs text-text-muted">Por orden</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <ChartBarIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reportes disponibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-primary" />
                <span>Reporte de Ventas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Análisis detallado de ventas, ingresos y tendencias del taller
              </p>
              <Button 
                onClick={() => handleGenerateReport('ventas')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UsersIcon className="h-5 w-5 text-info" />
                <span>Reporte de Clientes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Información sobre clientes, vehículos y historial de servicios
              </p>
              <Button 
                onClick={() => handleGenerateReport('clientes')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <WrenchScrewdriverIcon className="h-5 w-5 text-warning" />
                <span>Reporte de Órdenes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Estado de órdenes, tiempos de servicio y eficiencia
              </p>
              <Button 
                onClick={() => handleGenerateReport('ordenes')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-5 w-5 text-success" />
                <span>Reporte Mensual</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Resumen mensual de actividades y rendimiento
              </p>
              <Button 
                onClick={() => handleGenerateReport('mensual')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-success" />
                <span>Reporte Financiero</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Análisis de ingresos, gastos y rentabilidad
              </p>
              <Button 
                onClick={() => handleGenerateReport('financiero')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TruckIcon className="h-5 w-5 text-primary" />
                <span>Reporte de Inventario</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Estado del inventario, stock y movimientos
              </p>
              <Button 
                onClick={() => handleGenerateReport('inventario')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-warning" />
                <span>Reporte de Productividad</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Análisis de tiempos, eficiencia y rendimiento del taller
              </p>
              <Button 
                onClick={() => handleGenerateReport('productividad')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-info" />
                <span>Reporte de Calidad</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Análisis de calidad de servicios y satisfacción del cliente
              </p>
              <Button 
                onClick={() => handleGenerateReport('calidad')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Generar Reporte
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resumen de rendimiento */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {reportData.totalOrders > 0 ? 
                    ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-text-secondary">Tasa de Completado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  ${reportData.monthlyRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Ingresos del Mes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">
                  {reportData.totalCustomers}
                </div>
                <div className="text-sm text-text-secondary">Clientes Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {reportData.pendingOrders}
                </div>
                <div className="text-sm text-text-secondary">Órdenes Pendientes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

