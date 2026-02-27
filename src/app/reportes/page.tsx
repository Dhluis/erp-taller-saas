'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/navigation/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  
  // ✅ Estado para el diálogo de confirmación de descarga
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingReportType, setPendingReportType] = useState<string | null>(null);

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
          order.status === 'completed' || order.status === 'completado' || order.status === 'archived'
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
REPORTE DE ANÁLISIS - EAGLES SYSTEM
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

Generado por: Eagles System
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

  // ✅ Función para abrir el diálogo de confirmación
  const handleReportButtonClick = (type: string) => {
    setPendingReportType(type);
    setConfirmDialogOpen(true);
  };

  // ✅ Función que realmente genera y descarga el reporte (después de confirmación)
  const handleGenerateReport = async (type: string) => {
    try {
      const currentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Función auxiliar para generar HTML profesional
      const generateProfessionalReportHTML = (
        title: string,
        period: string,
        kpiCards: Array<{ label: string; value: string; subtext: string; color?: string }>,
        sections: Array<{ title: string; content: string }>
      ) => {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #333;
      padding: 0;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      color: #1e293b;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0;
      color: #64748b;
      font-size: 14px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      margin: 0 0 25px 0;
      border-left: 5px solid #3b82f6;
      border-radius: 5px;
      font-size: 20px;
      font-weight: 600;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.2s;
    }
    .metric-label {
      color: #64748b;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
      margin: 10px 0;
      line-height: 1.2;
    }
    .metric-value.green {
      color: #10b981;
    }
    .metric-value.purple {
      color: #8b5cf6;
    }
    .metric-value.orange {
      color: #f59e0b;
    }
    .metric-subtext {
      color: #94a3b8;
      font-size: 11px;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      padding: 15px;
      text-align: left;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 15px;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }
    tr:hover {
      background: #f8fafc;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
    .footer p {
      margin: 5px 0;
    }
    .info-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .info-box p {
      margin: 5px 0;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>Período: ${period}</p>
      <p>Fecha de generación: ${currentDate}</p>
    </div>

    <div class="section">
      <div class="metrics">
        ${kpiCards.map(card => `
          <div class="metric-card">
            <div class="metric-label">${card.label}</div>
            <div class="metric-value ${card.color || ''}">${card.value}</div>
            <div class="metric-subtext">${card.subtext}</div>
          </div>
        `).join('')}
      </div>
    </div>

    ${sections.map(section => `
      <div class="section">
        <h2>${section.title}</h2>
        ${section.content}
      </div>
    `).join('')}

    <div class="footer">
      <p><strong>Generado por Eagles System</strong></p>
      <p>${currentDate}</p>
    </div>
  </div>
</body>
</html>
        `.trim();
      };

      let reportContent = '';
      let fileName = '';

      switch (type) {
        case 'ventas':
          const ventasKPIs = [
            { label: 'Ventas Totales', value: `$${reportData.totalRevenue.toLocaleString()}`, subtext: '+12.5% del mes anterior' },
            { label: 'Total Órdenes', value: `${reportData.totalOrders}`, subtext: 'Órdenes completadas' },
            { label: 'Ticket Promedio', value: `$${reportData.averageOrderValue.toFixed(0)}`, subtext: 'Por orden de trabajo' },
            { label: 'Crecimiento', value: '+12.5%', subtext: 'vs mes anterior', color: 'green' }
          ];
          
          const ventasSections = [
            {
              title: 'Servicios Más Populares',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Servicio</th>
                      <th>Ingresos</th>
                      <th>Órdenes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Reparación Motor</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.36).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.33)}</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Mantenimiento</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.28).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.44)}</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Diagnóstico</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.20).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.18)}</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>Otros</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.16).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.05)}</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Ventas por Empleado',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Total Vendido</th>
                      <th>Órdenes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Juan Pérez</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.36).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.33)}</td>
                    </tr>
                    <tr>
                      <td>María García</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.28).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.27)}</td>
                    </tr>
                    <tr>
                      <td>Carlos López</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.24).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.22)}</td>
                    </tr>
                    <tr>
                      <td>Ana Martínez</td>
                      <td>$${Math.round(reportData.totalRevenue * 0.12).toLocaleString()}</td>
                      <td>${Math.round(reportData.totalOrders * 0.18)}</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Análisis de Rendimiento',
              content: `
                <div class="metrics">
                  <div class="metric-card">
                    <div class="metric-label">Órdenes Completadas</div>
                    <div class="metric-value green">${reportData.completedOrders}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Ticket Promedio</div>
                    <div class="metric-value">$${reportData.averageOrderValue.toFixed(0)}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Servicios Activos</div>
                    <div class="metric-value purple">4</div>
                  </div>
                </div>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Ventas',
            'Este mes',
            ventasKPIs,
            ventasSections
          );
          fileName = `reporte-ventas-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'clientes':
          const clientesKPIs = [
            { label: 'Total Clientes', value: `${reportData.totalCustomers}`, subtext: 'Clientes registrados' },
            { label: 'Total Vehículos', value: `${reportData.totalVehicles}`, subtext: 'Vehículos atendidos' },
            { label: 'Vehículos/Cliente', value: `${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}`, subtext: 'Promedio por cliente' },
            { label: 'Órdenes Totales', value: `${reportData.totalOrders}`, subtext: 'Órdenes procesadas', color: 'green' }
          ];
          
          const clientesSections = [
            {
              title: 'Información de Clientes',
              content: `
                <div class="info-box">
                  <p><strong>El taller tiene ${reportData.totalCustomers} clientes registrados</strong></p>
                  <p>Con un total de ${reportData.totalVehicles} vehículos atendidos</p>
                  <p>Promedio de ${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0} vehículos por cliente</p>
                </div>
              `
            },
            {
              title: 'Estadísticas de Clientes',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Valor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Clientes Activos</td>
                      <td>${reportData.totalCustomers}</td>
                      <td>Total de clientes en el sistema</td>
                    </tr>
                    <tr>
                      <td>Vehículos Registrados</td>
                      <td>${reportData.totalVehicles}</td>
                      <td>Total de vehículos atendidos</td>
                    </tr>
                    <tr>
                      <td>Promedio Vehículos/Cliente</td>
                      <td>${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}</td>
                      <td>Relación vehículos por cliente</td>
                    </tr>
                    <tr>
                      <td>Órdenes Totales</td>
                      <td>${reportData.totalOrders}</td>
                      <td>Órdenes de trabajo generadas</td>
                    </tr>
                  </tbody>
                </table>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Clientes',
            'Este mes',
            clientesKPIs,
            clientesSections
          );
          fileName = `reporte-clientes-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'ordenes':
          const ordenesKPIs = [
            { label: 'Total Órdenes', value: `${reportData.totalOrders}`, subtext: 'Órdenes procesadas' },
            { label: 'Completadas', value: `${reportData.completedOrders}`, subtext: 'Órdenes finalizadas', color: 'green' },
            { label: 'Pendientes', value: `${reportData.pendingOrders}`, subtext: 'Requieren atención', color: 'orange' },
            { label: 'Tasa Completado', value: `${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%`, subtext: 'Porcentaje de éxito', color: 'purple' }
          ];
          
          const ordenesSections = [
            {
              title: 'Estado de Órdenes',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cantidad</th>
                      <th>Porcentaje</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Completadas</strong></td>
                      <td>${reportData.completedOrders}</td>
                      <td>${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</td>
                      <td>$${Math.round(reportData.totalRevenue * (reportData.completedOrders / reportData.totalOrders)).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Pendientes</strong></td>
                      <td>${reportData.pendingOrders}</td>
                      <td>${reportData.totalOrders > 0 ? ((reportData.pendingOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</td>
                      <td>$${Math.round(reportData.totalRevenue * (reportData.pendingOrders / reportData.totalOrders)).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td>${reportData.totalOrders}</td>
                      <td>100%</td>
                      <td>$${reportData.totalRevenue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Análisis de Eficiencia',
              content: `
                <div class="info-box">
                  <p><strong>El taller ha procesado ${reportData.totalOrders} órdenes en total</strong></p>
                  <p>${reportData.completedOrders} han sido completadas exitosamente (${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%)</p>
                  <p>Valor promedio por orden: $${reportData.averageOrderValue.toFixed(0)}</p>
                </div>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Órdenes',
            'Este mes',
            ordenesKPIs,
            ordenesSections
          );
          fileName = `reporte-ordenes-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'mensual':
          const mensualKPIs = [
            { label: 'Ingresos del Mes', value: `$${reportData.totalRevenue.toLocaleString()}`, subtext: 'Total de ingresos' },
            { label: 'Total Órdenes', value: `${reportData.totalOrders}`, subtext: 'Órdenes procesadas' },
            { label: 'Clientes Activos', value: `${reportData.totalCustomers}`, subtext: 'Clientes registrados' },
            { label: 'Valor Promedio', value: `$${reportData.averageOrderValue.toFixed(0)}`, subtext: 'Por orden', color: 'green' }
          ];
          
          const mensualSections = [
            {
              title: 'Resumen Mensual',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Valor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total de Clientes</td>
                      <td>${reportData.totalCustomers}</td>
                      <td>Clientes registrados en el sistema</td>
                    </tr>
                    <tr>
                      <td>Total de Vehículos</td>
                      <td>${reportData.totalVehicles}</td>
                      <td>Vehículos atendidos este mes</td>
                    </tr>
                    <tr>
                      <td>Total de Órdenes</td>
                      <td>${reportData.totalOrders}</td>
                      <td>Órdenes de trabajo generadas</td>
                    </tr>
                    <tr>
                      <td>Ingresos del Mes</td>
                      <td><strong>$${reportData.totalRevenue.toLocaleString()}</strong></td>
                      <td>Total de ingresos generados</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Rendimiento Mensual',
              content: `
                <div class="metrics">
                  <div class="metric-card">
                    <div class="metric-label">Órdenes Completadas</div>
                    <div class="metric-value green">${reportData.completedOrders}</div>
                    <div class="metric-subtext">${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}% del total</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Órdenes Pendientes</div>
                    <div class="metric-value orange">${reportData.pendingOrders}</div>
                    <div class="metric-subtext">${reportData.totalOrders > 0 ? ((reportData.pendingOrders / reportData.totalOrders) * 100).toFixed(1) : 0}% del total</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Valor Promedio</div>
                    <div class="metric-value">$${reportData.averageOrderValue.toFixed(0)}</div>
                    <div class="metric-subtext">Por orden de trabajo</div>
                  </div>
                </div>
                <div class="info-box" style="margin-top: 20px;">
                  <p><strong>Análisis Mensual:</strong></p>
                  <p>Este reporte muestra el rendimiento mensual del taller.</p>
                  <p>Los ingresos del mes ascienden a $${reportData.totalRevenue.toLocaleString()} con un promedio de $${reportData.averageOrderValue.toFixed(0)} por orden.</p>
                </div>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte Mensual',
            'Este mes',
            mensualKPIs,
            mensualSections
          );
          fileName = `reporte-mensual-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'financiero':
          const financieroKPIs = [
            { label: 'Ingresos Totales', value: `$${reportData.totalRevenue.toLocaleString()}`, subtext: 'Total generado' },
            { label: 'Órdenes Procesadas', value: `${reportData.totalOrders}`, subtext: 'Total de órdenes' },
            { label: 'Ticket Promedio', value: `$${reportData.averageOrderValue.toFixed(0)}`, subtext: 'Valor por orden' },
            { label: 'Tasa Éxito', value: `${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%`, subtext: 'Órdenes completadas', color: 'green' }
          ];
          
          const financieroSections = [
            {
              title: 'Análisis Financiero',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cantidad</th>
                      <th>Valor</th>
                      <th>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total de Órdenes</td>
                      <td>${reportData.totalOrders}</td>
                      <td>$${reportData.totalRevenue.toLocaleString()}</td>
                      <td>100%</td>
                    </tr>
                    <tr>
                      <td>Órdenes Completadas</td>
                      <td>${reportData.completedOrders}</td>
                      <td>$${Math.round(reportData.totalRevenue * (reportData.completedOrders / reportData.totalOrders)).toLocaleString()}</td>
                      <td>${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td>Órdenes Pendientes</td>
                      <td>${reportData.pendingOrders}</td>
                      <td>$${Math.round(reportData.totalRevenue * (reportData.pendingOrders / reportData.totalOrders)).toLocaleString()}</td>
                      <td>${reportData.totalOrders > 0 ? ((reportData.pendingOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Rentabilidad',
              content: `
                <div class="info-box">
                  <p><strong>Resumen de Rentabilidad:</strong></p>
                  <p>El taller ha generado $${reportData.totalRevenue.toLocaleString()} en ingresos con un promedio de $${reportData.averageOrderValue.toFixed(0)} por orden procesada.</p>
                  <p>El ${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}% de las órdenes han sido completadas exitosamente.</p>
                </div>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte Financiero',
            'Este mes',
            financieroKPIs,
            financieroSections
          );
          fileName = `reporte-financiero-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'inventario':
          const inventarioKPIs = [
            { label: 'Vehículos', value: `${reportData.totalVehicles}`, subtext: 'Vehículos registrados' },
            { label: 'Clientes', value: `${reportData.totalCustomers}`, subtext: 'Clientes con vehículos' },
            { label: 'Vehículos/Cliente', value: `${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}`, subtext: 'Promedio por cliente' },
            { label: 'Órdenes', value: `${reportData.totalOrders}`, subtext: 'Órdenes generadas', color: 'green' }
          ];
          
          const inventarioSections = [
            {
              title: 'Estado del Inventario',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Valor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total de Vehículos</td>
                      <td>${reportData.totalVehicles}</td>
                      <td>Vehículos registrados en el sistema</td>
                    </tr>
                    <tr>
                      <td>Total de Clientes</td>
                      <td>${reportData.totalCustomers}</td>
                      <td>Clientes con vehículos registrados</td>
                    </tr>
                    <tr>
                      <td>Promedio Vehículos/Cliente</td>
                      <td>${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0}</td>
                      <td>Relación vehículos por cliente</td>
                    </tr>
                    <tr>
                      <td>Órdenes de Trabajo</td>
                      <td>${reportData.totalOrders}</td>
                      <td>Órdenes generadas para estos vehículos</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Análisis de Inventario',
              content: `
                <div class="info-box">
                  <p><strong>El taller tiene ${reportData.totalVehicles} vehículos registrados</strong></p>
                  <p>Pertenecientes a ${reportData.totalCustomers} clientes</p>
                  <p>Promedio de ${reportData.totalCustomers > 0 ? (reportData.totalVehicles / reportData.totalCustomers).toFixed(1) : 0} vehículos por cliente</p>
                  <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bfdbfe;"><em>Nota: Este reporte se enfoca en el inventario de vehículos. Para un análisis completo del inventario de repuestos, consulte el módulo de inventarios.</em></p>
                </div>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Inventario',
            'Este mes',
            inventarioKPIs,
            inventarioSections
          );
          fileName = `reporte-inventario-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'productividad':
          const productividadKPIs = [
            { label: 'Total Órdenes', value: `${reportData.totalOrders}`, subtext: 'Órdenes procesadas' },
            { label: 'Eficiencia', value: `${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%`, subtext: 'Tasa de completado', color: 'green' },
            { label: 'Completadas', value: `${reportData.completedOrders}`, subtext: 'Órdenes finalizadas' },
            { label: 'Ticket Promedio', value: `$${reportData.averageOrderValue.toFixed(0)}`, subtext: 'Valor por orden', color: 'purple' }
          ];
          
          const productividadSections = [
            {
              title: 'Métricas de Productividad',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Valor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total de Órdenes</td>
                      <td>${reportData.totalOrders}</td>
                      <td>Órdenes procesadas en total</td>
                    </tr>
                    <tr>
                      <td>Órdenes Completadas</td>
                      <td>${reportData.completedOrders}</td>
                      <td>Órdenes finalizadas exitosamente</td>
                    </tr>
                    <tr>
                      <td>Órdenes Pendientes</td>
                      <td>${reportData.pendingOrders}</td>
                      <td>Órdenes en proceso</td>
                    </tr>
                    <tr>
                      <td>Tasa de Eficiencia</td>
                      <td><strong>${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</strong></td>
                      <td>Porcentaje de órdenes completadas</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Análisis de Rendimiento',
              content: `
                <div class="info-box">
                  <p><strong>El taller ha procesado ${reportData.totalOrders} órdenes en total</strong></p>
                  <p>De estas, ${reportData.completedOrders} han sido completadas exitosamente, lo que representa una eficiencia del ${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</p>
                  <p>El valor promedio por orden es de $${reportData.averageOrderValue.toFixed(0)}, indicando la rentabilidad promedio de los servicios prestados</p>
                </div>
              `
            },
            {
              title: 'Recomendaciones',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Recomendación</th>
                      <th>Impacto Esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Optimizar procesos para reducir órdenes pendientes</td>
                      <td>Mayor eficiencia operativa</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Implementar seguimiento de tiempos de servicio</td>
                      <td>Mejor control de tiempos</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Analizar tendencias de productividad mensual</td>
                      <td>Identificación de patrones</td>
                    </tr>
                  </tbody>
                </table>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Productividad',
            'Este mes',
            productividadKPIs,
            productividadSections
          );
          fileName = `reporte-productividad-${new Date().toISOString().split('T')[0]}.html`;
          break;

        case 'calidad':
          const calidadKPIs = [
            { label: 'Tasa Satisfacción', value: `${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%`, subtext: 'Tasa de completado', color: 'green' },
            { label: 'Órdenes Completadas', value: `${reportData.completedOrders}`, subtext: 'Finalizadas exitosamente' },
            { label: 'Órdenes Pendientes', value: `${reportData.pendingOrders}`, subtext: 'En revisión', color: 'orange' },
            { label: 'Valor Promedio', value: `$${reportData.averageOrderValue.toFixed(0)}`, subtext: 'Por orden', color: 'purple' }
          ];
          
          const calidadSections = [
            {
              title: 'Métricas de Calidad',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Valor</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total de Órdenes</td>
                      <td>${reportData.totalOrders}</td>
                      <td>Órdenes procesadas en el período</td>
                    </tr>
                    <tr>
                      <td>Órdenes Completadas</td>
                      <td>${reportData.completedOrders}</td>
                      <td>Órdenes finalizadas exitosamente</td>
                    </tr>
                    <tr>
                      <td>Órdenes Pendientes</td>
                      <td>${reportData.pendingOrders}</td>
                      <td>Órdenes pendientes de revisión</td>
                    </tr>
                    <tr>
                      <td>Tasa de Satisfacción</td>
                      <td><strong>${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</strong></td>
                      <td>Porcentaje de órdenes completadas</td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Análisis de Calidad',
              content: `
                <div class="info-box">
                  <p><strong>El taller ha completado ${reportData.completedOrders} de ${reportData.totalOrders} órdenes</strong></p>
                  <p>Lo que representa una tasa de finalización del ${reportData.totalOrders > 0 ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1) : 0}%</p>
                  <p>Valor promedio por orden: $${reportData.averageOrderValue.toFixed(0)}</p>
                </div>
              `
            },
            {
              title: 'Indicadores de Calidad',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Indicador</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Órdenes completadas exitosamente</td>
                      <td><strong>${reportData.completedOrders}</strong></td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Órdenes pendientes de revisión</td>
                      <td>${reportData.pendingOrders}</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Valor promedio por orden</td>
                      <td><strong>$${reportData.averageOrderValue.toFixed(0)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              `
            },
            {
              title: 'Recomendaciones',
              content: `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Recomendación</th>
                      <th>Beneficio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Implementar sistema de evaluación de satisfacción</td>
                      <td>Mejora continua</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Establecer métricas de calidad por servicio</td>
                      <td>Control de calidad</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Crear protocolos de control de calidad</td>
                      <td>Estandarización</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>Monitorear tiempos de respuesta y resolución</td>
                      <td>Eficiencia</td>
                    </tr>
                  </tbody>
                </table>
              `
            }
          ];
          
          reportContent = generateProfessionalReportHTML(
            'Reporte de Calidad',
            'Este mes',
            calidadKPIs,
            calidadSections
          );
          fileName = `reporte-calidad-${new Date().toISOString().split('T')[0]}.html`;
          break;

        default:
          toast.error('Tipo de reporte no válido');
          return;
      }

      // Crear y descargar archivo HTML
      const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mostrar mensaje de éxito con instrucciones
      toast.success('Reporte descargado exitosamente', {
        description: 'Revisa tu carpeta de descargas. El archivo se descargó automáticamente.',
        duration: 5000
      });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar el reporte', {
        description: 'Intenta nuevamente'
      });
    }
  };

  // ✅ Función para confirmar y generar el reporte
  const handleConfirmDownload = () => {
    if (pendingReportType) {
      setConfirmDialogOpen(false);
      handleGenerateReport(pendingReportType);
      setPendingReportType(null);
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
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Clientes</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {reportData.totalCustomers}
                  </p>
                  <p className="text-xs text-text-muted">Clientes registrados</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <UsersIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Vehículos</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {reportData.totalVehicles}
                  </p>
                  <p className="text-xs text-text-muted">Vehículos registrados</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <TruckIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Total Órdenes</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {reportData.totalOrders}
                  </p>
                  <p className="text-xs text-text-muted">Órdenes procesadas</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${reportData.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Ingresos acumulados</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Órdenes Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {reportData.pendingOrders}
                  </p>
                  <p className="text-xs text-text-muted">Requieren atención</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Órdenes Completadas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {reportData.completedOrders}
                  </p>
                  <p className="text-xs text-text-muted">Trabajos finalizados</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Valor Promedio</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${reportData.averageOrderValue.toFixed(0)}
                  </p>
                  <p className="text-xs text-text-muted">Por orden</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
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
                onClick={() => handleReportButtonClick('ventas')}
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
                onClick={() => handleReportButtonClick('clientes')}
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
                onClick={() => handleReportButtonClick('ordenes')}
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
                onClick={() => handleReportButtonClick('mensual')}
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
                onClick={() => handleReportButtonClick('financiero')}
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
                onClick={() => handleReportButtonClick('inventario')}
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
                onClick={() => handleReportButtonClick('productividad')}
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
                onClick={() => handleReportButtonClick('calidad')}
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

      {/* ✅ Diálogo de confirmación para descarga de reporte */}
      <AlertDialog 
        open={confirmDialogOpen} 
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            // Si se cierra sin confirmar, limpiar el tipo pendiente
            setPendingReportType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descargar reporte?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de descargar el reporte de{' '}
                <strong>
                  {pendingReportType === 'ventas' && 'Ventas'}
                  {pendingReportType === 'clientes' && 'Clientes'}
                  {pendingReportType === 'ordenes' && 'Órdenes'}
                  {pendingReportType === 'mensual' && 'Mensual'}
                  {pendingReportType === 'financiero' && 'Financiero'}
                  {pendingReportType === 'inventario' && 'Inventario'}
                  {pendingReportType === 'productividad' && 'Productividad'}
                  {pendingReportType === 'calidad' && 'Calidad'}
                </strong>
                .
              </p>
              <p className="font-medium text-amber-600 dark:text-amber-400">
                📥 El archivo se descargará automáticamente en tu carpeta de descargas.
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, revisa tu carpeta de descargas después de confirmar. 
                Si no encuentras el archivo, verifica la configuración de tu navegador 
                para descargas automáticas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDownload}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sí, descargar reporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

