'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ModernIcons from '@/components/icons/ModernIcons';
import { CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization, useSession } from '@/lib/context/SessionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getAlertasInventario } from '@/lib/database/queries/dashboard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
  // Obtener datos de sesión - el layout maneja la redirección al onboarding
  const { organizationId, isLoading: sessionLoading, isReady: sessionReady } = useOrganization();
  const { user } = useSession();
  const permissions = usePermissions();
  
  // Compatibilidad: obtener organization para componentes que lo necesitan
  const organization = organizationId ? { id: organizationId, organization_id: organizationId } : null;
  const [dateRange, setDateRange] = useState('all'); // ✅ Cambiar a 'all' por defecto para mostrar todas las órdenes
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined
  });
  const [ordersByStatus, setOrdersByStatus] = useState([
    { name: 'Recepción', value: 0, color: '#6b7280' },
    { name: 'Diagnóstico', value: 0, color: '#8b5cf6' },
    { name: 'Cotización', value: 0, color: '#3b82f6' },
    { name: 'Esperando Aprobación', value: 0, color: '#f59e0b' },
    { name: 'Desarmado', value: 0, color: '#ec4899' },
    { name: 'Esperando Piezas', value: 0, color: '#f97316' },
    { name: 'Armado', value: 0, color: '#06b6d4' },
    { name: 'Pruebas', value: 0, color: '#14b8a6' },
    { name: 'Listo', value: 0, color: '#84cc16' },
    { name: 'Completado', value: 0, color: '#10b981' }
  ]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // ✅ Estado para ingresos y otras métricas - MOVER ANTES DEL RETURN CONDICIONAL
  const [ingresos, setIngresos] = useState(0);
  const [clientesAtendidos, setClientesAtendidos] = useState(0);
  const [alertasInventario, setAlertasInventario] = useState(0);
  const [incomeData, setIncomeData] = useState<Array<{ date: string; ingresos: number; ordenes: number }>>([]);

  // Función para cargar datos de órdenes por estado
  const loadOrdersByStatus = useCallback(async () => {
    // ✅ No cargar si no hay organizationId o está cargando
    if (!organizationId || sessionLoading || !sessionReady) {
      console.log('⚠️ Esperando organizationId...');
      return;
    }
    
    try {
      console.log('🔄 Cargando estadísticas de órdenes...');
      console.log('📅 Filtro de fecha activo:', dateRange);
      console.log('🔍 Organization ID:', organizationId);
      setLoading(true);
      
      // Construir URL con parámetro de fecha
      let url = `/api/orders/stats?timeFilter=${dateRange}`;
      // ✅ Enviar organizationId para consistencia (aunque el API también lo obtiene)
      url += `&organizationId=${organizationId}`;
      
      // Si es custom y tiene fechas, agregar parámetros adicionales
      if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
        const fromISO = customDateRange.from.toISOString();
        const toISO = customDateRange.to.toISOString();
        url = `/api/orders/stats?timeFilter=custom&from=${fromISO}&to=${toISO}&organizationId=${organizationId}`;
      }
      
      console.log('🔗 URL de la petición:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.warn(`⚠️ Error al cargar estadísticas: ${response.status}`);
        // Usar datos por defecto si falla
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 DASHBOARD - DATOS RECIBIDOS DE LA API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Filtro aplicado:', dateRange);
      if (dateRange === 'custom') {
        console.log('Rango personalizado:', {
          from: customDateRange.from?.toISOString(),
          to: customDateRange.to?.toISOString()
        });
      }
      console.log('Datos por estado:', data);
      
      // Mostrar información de debug si está disponible
      if (data._debug) {
        console.log('🔍 DEBUG INFO:');
        console.log('  📊 Total órdenes en BD (sin filtro):', data._debug.totalOrdersInDB || 0);
        console.log('  📅 Órdenes después de filtrar por fecha:', data._debug.ordersAfterDateFilter || 0);
        console.log('  📆 Rango de fechas:', {
          desde: data._debug.filterFrom,
          hasta: data._debug.filterTo
        });
        console.log('  📋 Muestra de órdenes (primeras 3):', data._debug.sampleOrders || []);
        console.log('  🏢 Organization ID:', data._debug.organizationId);
        
        // Si hay órdenes en BD pero no pasan el filtro, mostrar advertencia
        if (data._debug.totalOrdersInDB > 0 && data._debug.ordersAfterDateFilter === 0) {
          console.warn('⚠️ Hay órdenes en la BD pero ninguna está en el rango de fechas seleccionado');
          console.warn('   Considera cambiar el filtro de fecha o verificar las fechas de las órdenes');
        }
        
        // Si no hay órdenes en BD, mostrar mensaje informativo
        if (data._debug.totalOrdersInDB === 0) {
          console.info('ℹ️ No hay órdenes en la base de datos para esta organización');
          console.info('   Organization ID:', data._debug.organizationId);
        }
      }
      
      const totalFromAPI = Object.entries(data)
        .filter(([key]) => key !== 'success' && key !== 'total' && key !== '_debug')
        .reduce((sum, [_, val]) => sum + (typeof val === 'number' ? val : 0), 0);
      console.log('Total de órdenes (calculado):', totalFromAPI);
      console.log('Total de órdenes (del API):', data.total);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Mapear los datos de la API al formato esperado por la gráfica
      // Usar los nombres de campos en inglés que ahora devuelve el endpoint
      const updatedOrdersByStatus = [
        { name: 'Recepción', value: data.reception || 0, color: '#6b7280' },
        { name: 'Diagnóstico', value: data.diagnosis || 0, color: '#8b5cf6' },
        { name: 'Cotización', value: data.initial_quote || 0, color: '#3b82f6' },
        { name: 'Esperando Aprobación', value: data.waiting_approval || 0, color: '#f59e0b' },
        { name: 'Desarmado', value: data.disassembly || 0, color: '#ec4899' },
        { name: 'Esperando Piezas', value: data.waiting_parts || 0, color: '#f97316' },
        { name: 'Armado', value: data.assembly || 0, color: '#06b6d4' },
        { name: 'Pruebas', value: data.testing || 0, color: '#14b8a6' },
        { name: 'Listo', value: data.ready || 0, color: '#84cc16' },
        { name: 'Completado', value: data.completed || 0, color: '#10b981' }
      ];
      
      console.log('✅ Datos mapeados para gráfica:', updatedOrdersByStatus);
      setOrdersByStatus(updatedOrdersByStatus);
      console.log('✅ Estado actualizado correctamente');
    } catch (error) {
      console.error('❌ Error al cargar estadísticas de órdenes:', error);
      // Mantener datos por defecto en caso de error
      console.log('ℹ️ Usando datos por defecto (vacíos)');
    } finally {
      setLoading(false);
      console.log('✅ Carga finalizada');
    }
  }, [dateRange, customDateRange, organizationId, sessionLoading]);

  // Cargar datos al montar el componente y cuando cambia el filtro de fecha o las fechas personalizadas
  useEffect(() => {
    loadOrdersByStatus();
  }, [loadOrdersByStatus]);

  // Función para cargar ingresos y clientes atendidos desde órdenes completadas
  const loadIncomeAndCustomers = useCallback(async () => {
    if (!organizationId || sessionLoading || !sessionReady) return;

    try {
      // Calcular rango de fechas según el filtro actual
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let fromDate: Date;
      let toDate: Date = today;
      
      switch (dateRange) {
        case 'all':
          // ✅ Para "all", usar un rango muy amplio (últimos 10 años) para incluir todas las órdenes
          fromDate = new Date(today);
          fromDate.setFullYear(today.getFullYear() - 10);
          fromDate.setHours(0, 0, 0, 0);
          break;
        case '7d':
          fromDate = new Date(today);
          fromDate.setDate(today.getDate() - 7);
          fromDate.setHours(0, 0, 0, 0);
          break;
        case '30d':
          fromDate = new Date(today);
          fromDate.setDate(today.getDate() - 30);
          fromDate.setHours(0, 0, 0, 0);
          break;
        case 'current_month':
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          break;
        case 'custom':
          if (customDateRange.from && customDateRange.to) {
            fromDate = customDateRange.from;
            toDate = customDateRange.to;
          } else {
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - 7);
            fromDate.setHours(0, 0, 0, 0);
          }
          break;
        default:
          fromDate = new Date(today);
          fromDate.setDate(today.getDate() - 7);
          fromDate.setHours(0, 0, 0, 0);
      }

      // Obtener órdenes completadas (la API no soporta filtro de fecha, así que filtramos en frontend)
      const response = await fetch(
        `/api/work-orders?status=completed`,
        { credentials: 'include', cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        
        // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
        let allOrders: any[] = [];
        
        if (data.success && data.data) {
          // Estructura paginada
          if (data.data.items && Array.isArray(data.data.items)) {
            allOrders = data.data.items;
          } else if (Array.isArray(data.data)) {
            // Estructura directa (array)
            allOrders = data.data;
          }
        } else if (Array.isArray(data.data)) {
          // Fallback: data.data es array directo
          allOrders = data.data;
        } else if (Array.isArray(data)) {
          // Fallback: data es array directo
          allOrders = data;
        }
        
        // ✅ Validar que allOrders sea un array antes de continuar
        if (!Array.isArray(allOrders)) {
          console.error('❌ [Dashboard] allOrders no es un array:', typeof allOrders, allOrders);
          setIngresos(0);
          setClientesAtendidos(0);
          setIncomeData([]);
          return;
        }
        
        // ✅ MULTI-TENANCY: Filtrar órdenes por organización (seguridad adicional)
        // La API ya filtra por organization_id, pero esto es una capa extra de seguridad
        const ordersFromOrg = allOrders.filter((order: any) => {
          return order && order.organization_id === organizationId;
        });
        
        if (ordersFromOrg.length !== allOrders.length) {
          console.warn('⚠️ MULTI-TENANCY: Se encontraron órdenes de otras organizaciones. Filtrando...');
          console.warn(`   Órdenes totales: ${allOrders.length}, Órdenes de la org: ${ordersFromOrg.length}`);
        }
        
        // Filtrar órdenes por rango de fechas (usar completed_at o created_at)
        const filteredOrders = ordersFromOrg.filter((order: any) => {
          const orderDate = order.completed_at 
            ? new Date(order.completed_at)
            : order.created_at 
            ? new Date(order.created_at)
            : null;
          
          if (!orderDate) return false;
          
          orderDate.setHours(0, 0, 0, 0);
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          
          return orderDate >= from && orderDate <= to;
        });
        
        // Calcular ingresos totales
        const totalIngresos = filteredOrders.reduce((sum: number, order: any) => {
          return sum + (parseFloat(order.total_amount) || 0);
        }, 0);
        
        // Contar clientes únicos
        const uniqueCustomers = new Set(
          filteredOrders.map((order: any) => order.customer_id).filter(Boolean)
        );
        
        setIngresos(totalIngresos);
        setClientesAtendidos(uniqueCustomers.size);
        
        // Cargar alertas de inventario
        try {
          const alertas = await getAlertasInventario(organizationId);
          setAlertasInventario(alertas);
        } catch (error) {
          console.error('Error cargando alertas de inventario:', error);
          setAlertasInventario(0);
        }
        
        // ✅ Calcular ingresos y órdenes por día para el gráfico
        // Agrupar órdenes por día
        const ordersByDay: { [key: string]: { ingresos: number; ordenes: number } } = {};
        
        filteredOrders.forEach((order: any) => {
          const orderDate = order.completed_at 
            ? new Date(order.completed_at)
            : order.created_at 
            ? new Date(order.created_at)
            : null;
          
          if (!orderDate) return;
          
          // Formatear fecha como clave (YYYY-MM-DD)
          const dateKey = orderDate.toISOString().split('T')[0];
          
          if (!ordersByDay[dateKey]) {
            ordersByDay[dateKey] = { ingresos: 0, ordenes: 0 };
          }
          
          ordersByDay[dateKey].ingresos += parseFloat(order.total_amount) || 0;
          ordersByDay[dateKey].ordenes += 1;
        });
        
        // Generar datos para los últimos 7 días (o el rango seleccionado)
        // Para 'all', mostrar los últimos 30 días para no sobrecargar el gráfico
        const daysToShow = dateRange === 'all' ? 30 :
                          dateRange === '7d' ? 7 : 
                          dateRange === '30d' ? 30 : 
                          dateRange === 'current_month' ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() :
                          customDateRange.from && customDateRange.to 
                            ? Math.ceil((customDateRange.to.getTime() - customDateRange.from.getTime()) / (1000 * 60 * 60 * 24))
                            : 7;
        
        const chartData: Array<{ date: string; ingresos: number; ordenes: number }> = [];
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        for (let i = daysToShow - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const dateKey = date.toISOString().split('T')[0];
          const dayData = ordersByDay[dateKey] || { ingresos: 0, ordenes: 0 };
          
          // Formatear fecha para mostrar (día de la semana abreviado)
          const dayName = dayNames[date.getDay()];
          const dayNumber = date.getDate();
          const monthName = date.toLocaleDateString('es-MX', { month: 'short' }).substring(0, 3);
          
          chartData.push({
            date: daysToShow <= 7 ? dayName : `${dayNumber} ${monthName}`,
            ingresos: dayData.ingresos,
            ordenes: dayData.ordenes
          });
        }
        
        setIncomeData(chartData);
        
        console.log('💰 Ingresos calculados:', {
          totalIngresos,
          clientesAtendidos: uniqueCustomers.size,
          ordenesFiltradas: filteredOrders.length,
          rango: { from: fromDate.toISOString(), to: toDate.toISOString() },
          // ✅ Multi-tenancy: Verificar que todas las órdenes pertenezcan a la organización
          todasOrdenesConOrgId: filteredOrders.every((o: any) => o.organization_id === organizationId)
        });
      }
    } catch (error) {
      console.error('Error cargando ingresos:', error);
    }
  }, [organizationId, dateRange, customDateRange, sessionLoading, sessionReady]);

  // Cargar ingresos cuando cambia el filtro
  useEffect(() => {
    loadIncomeAndCustomers();
  }, [loadIncomeAndCustomers]);

  // Mostrar loading mientras carga la sesión (el layout maneja redirecciones)
  // ✅ IMPORTANTE: Este return debe estar DESPUÉS de todos los hooks para evitar React error #310
  if (sessionLoading || !sessionReady || !organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Handler para cuando se crea una nueva orden
  const handleOrderCreated = () => {
    console.log('✅ Nueva orden creada desde el modal');
    loadOrdersByStatus(); // Recargar estadísticas
    router.refresh(); // Refrescar la página
  };

  // Calcular estadísticas dinámicamente de ordersByStatus
  const totalOrdenes = ordersByStatus.reduce((sum, item) => sum + item.value, 0);
  const ordenesActivas = ordersByStatus
    .filter(item => !['Recepción', 'Completado'].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0);
  const ordenesCompletadas = ordersByStatus.find(item => item.name === 'Completado')?.value || 0;
  const ordenesPendientes = ordersByStatus.find(item => item.name === 'Recepción')?.value || 0;

  console.log('📊 Estadísticas calculadas:', {
    total: totalOrdenes,
    activas: ordenesActivas,
    completadas: ordenesCompletadas,
    pendientes: ordenesPendientes,
    ingresos,
    clientesAtendidos
  });

  // Datos dinámicos para mostrar el dashboard
  const stats = {
    ingresos: ingresos,
    ordenesActivas: ordenesActivas,
    clientesAtendidos: clientesAtendidos,
    alertasInventario: alertasInventario,
    ordenesPendientes: ordenesPendientes,
    ordenesCompletadas: ordenesCompletadas
  };

  // ✅ incomeData ahora se carga dinámicamente desde loadIncomeAndCustomers
  // Si no hay datos aún, mostrar array vacío (se mostrará cuando carguen los datos)


  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

  // Texto descriptivo del filtro actual
  const filterDescription = dateRange === 'all' ? 'Todas las órdenes' :
                           dateRange === '7d' ? 'Últimos 7 días' :
                           dateRange === '30d' ? 'Últimos 30 días' :
                           dateRange === 'current_month' ? 'Mes actual' :
                           'Personalizado';

  // ✅ DASHBOARD SIMPLIFICADO PARA MECÁNICOS (mobile-first)
  const isMechanic = permissions.isMechanic;
  const kpiCards = isMechanic ? [
    // Mecánicos solo ven sus órdenes asignadas
    {
      title: 'Mis Órdenes Activas',
      value: stats.ordenesActivas.toString(),
      description: `En proceso (${filterDescription})`,
      trend: `Total: ${totalOrdenes} órdenes`,
      icon: () => <ModernIcons.Ordenes size={32} />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Órdenes Pendientes',
      value: stats.ordenesPendientes.toString(),
      description: `En recepción (${filterDescription})`,
      trend: '',
      icon: () => <ModernIcons.Citas size={32} />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Órdenes Completadas',
      value: stats.ordenesCompletadas.toString(),
      description: `Finalizadas (${filterDescription})`,
      trend: '',
      icon: () => <ModernIcons.Check size={32} />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ] : [
    // ✅ Solo mostrar ingresos si puede ver reportes financieros
    ...(permissions.canViewFinancialReports() ? [{
      title: 'Ingresos del Mes',
      value: `$${stats.ingresos.toLocaleString()}`,
      description: 'Total facturado',
      trend: '↓ 15.1% vs mes anterior',
      icon: () => <ModernIcons.Finanzas size={32} />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }] : []),
    {
      title: 'Órdenes Activas',
      value: stats.ordenesActivas.toString(),
      description: `En proceso (${filterDescription})`,
      trend: `Total: ${totalOrdenes} órdenes`,
      icon: () => <ModernIcons.Ordenes size={32} />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Clientes Atendidos',
      value: stats.clientesAtendidos.toString(),
      description: 'Este mes',
      trend: '↑ 0% vs mes anterior',
      icon: () => <ModernIcons.Clientes size={32} />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Alertas de Inventario',
      value: stats.alertasInventario.toString(),
      description: 'Stock bajo',
      trend: '↑ 0% vs mes anterior',
      icon: () => <ModernIcons.Warning size={32} />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Órdenes Pendientes',
      value: stats.ordenesPendientes.toString(),
      description: `En recepción (${filterDescription})`,
      trend: '',
      icon: () => <ModernIcons.Citas size={32} />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Órdenes Completadas',
      value: stats.ordenesCompletadas.toString(),
      description: `Finalizadas (${filterDescription})`,
      trend: '',
      icon: () => <ModernIcons.Check size={32} />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-400">
              {permissions.isMechanic ? 'Mis órdenes asignadas' : 'Resumen general de tu taller'}
            </p>
          </div>
        </div>

        {/* Filtros de fecha - Responsive para mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap bg-gray-800 rounded-lg p-1 gap-1">
            {['all', '7d', '30d', 'current_month'].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setCustomDateRange({ from: undefined, to: undefined });
                }}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === 'all' ? 'Todas' :
                 range === '7d' ? '7 días' :
                 range === '30d' ? '30 días' :
                 'Mes actual'}
              </button>
            ))}
            
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none ${
                    dateRange === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {customDateRange.from && customDateRange.to ? (
                      <>
                        {format(customDateRange.from, 'dd/MM', { locale: es })} - {format(customDateRange.to, 'dd/MM', { locale: es })}
                      </>
                    ) : (
                      'Personalizado'
                    )}
                  </span>
                  <span className="sm:hidden">Custom</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDateRange({
                        from: range.from,
                        to: range.to
                      });
                      setDateRange('custom');
                    }
                  }}
                  numberOfMonths={2}
                  className="rounded-md"
                  locale={es}
                  weekStartsOn={1}
                  formatters={{
                    formatDay: (day) => day.getDate().toString(),
                    formatWeekdayName: (day) => {
                      const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                      return weekdays[day.getDay()];
                    },
                    formatMonthName: (month) => {
                      const months = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      return months[month.getMonth()];
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <button 
            onClick={loadOrdersByStatus}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
          >
            <ModernIcons.Reportes size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{loading ? 'Cargando...' : 'Actualizar'}</span>
            <span className="sm:hidden">{loading ? '...' : '↻'}</span>
          </button>
        </div>

        {/* ✅ KPI Cards - Mobile-first: 1 col en móvil, 2 en tablet, 3 en desktop */}
        <div className={cn(
          "grid gap-3 sm:gap-4 md:gap-6",
          permissions.isMechanic 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" // Mecánicos: máximo 3 columnas
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" // Otros: hasta 3 columnas
        )}>
          {kpiCards.map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <div key={index} className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-lg ${kpi.bgColor}`}>
                    <IconComponent />
                  </div>
                  {kpi.trend && (
                    <span className={`text-xs sm:text-sm ${kpi.trend.includes('↓') ? 'text-red-400' : 'text-green-400'}`}>
                      {kpi.trend}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{kpi.value}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">{kpi.title}</p>
                  <p className="text-gray-500 text-xs">{kpi.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráficos y Acciones Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Columna Izquierda: Gráficos (2/3) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Gráfico de Ingresos */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 border border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">
                Ingresos {dateRange === 'all' ? '(Todas las Órdenes)' :
                         dateRange === '7d' ? 'de los Últimos 7 Días' : 
                         dateRange === '30d' ? 'de los Últimos 30 Días' :
                         dateRange === 'current_month' ? 'del Mes Actual' :
                         'del Período Seleccionado'}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">Tendencia de ingresos y órdenes procesadas</p>
              <div className="h-48 sm:h-64">
                {incomeData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Cargando datos de ingresos...</p>
                    </div>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incomeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ingresos" stroke="#00bcd4" name="Ingresos" strokeWidth={2} />
                    <Line type="monotone" dataKey="ordenes" stroke="#9333ea" name="Órdenes" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico de Órdenes por Estado */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 md:p-6 border border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">Órdenes por Estado</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">Distribución de órdenes en el flujo de trabajo</p>
              <div className="h-64 sm:h-80 md:h-[500px] lg:h-[600px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Cargando datos...</p>
                    </div>
                  </div>
                ) : ordersByStatus.every(item => item.value === 0) ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <ModernIcons.Warning size={48} className="mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No hay órdenes registradas</p>
                      <p className="text-gray-500 text-xs mt-1">Crea tu primera orden para ver estadísticas</p>
                    </div>
                  </div>
                ) : (
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Mobile: Pie chart pequeño con leyenda debajo */}
                  <ResponsiveContainer width="100%" height={250} className="sm:hidden">
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Tablet: Pie chart mediano */}
                  <ResponsiveContainer width="100%" height={400} className="hidden sm:block md:hidden">
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="35%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={(value, entry: any) => {
                          const item = ordersByStatus.find(s => s.name === value)
                          return `${value} (${item?.value || 0})`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Desktop: Pie chart grande y proporcional */}
                  <ResponsiveContainer width="100%" height={500} className="hidden md:block lg:hidden">
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="35%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={140}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '14px', paddingLeft: '20px' }}
                        formatter={(value, entry: any) => {
                          const item = ordersByStatus.find(s => s.name === value)
                          return `${value} (${item?.value || 0})`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Desktop Large: Pie chart extra grande */}
                  <ResponsiveContainer width="100%" height={600} className="hidden lg:block">
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="35%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={160}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '14px', paddingLeft: '20px' }}
                        formatter={(value, entry: any) => {
                          const item = ordersByStatus.find(s => s.name === value)
                          return `${value} (${item?.value || 0})`
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Leyenda para mobile */}
                  <div className="sm:hidden grid grid-cols-2 gap-2 w-full text-xs">
                    {ordersByStatus.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-300">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Acciones Rápidas (1/3) - Ocultar para mecánicos */}
          {!permissions.isMechanic && (
            <div className="lg:col-span-1">
              <QuickActions onOrderCreated={handleOrderCreated} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}