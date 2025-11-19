'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DollarSign, 
  Wrench, 
  Users, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  Car,
  TrendingUp,
  Package,
  CalendarIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { organization } = useAuth();
  // ✅ CORRECCIÓN: Usar organization_id del workshop, no el id del workshop
  const organizationId = organization?.organization_id;
  const [dateRange, setDateRange] = useState('7d');
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

  // Función para cargar datos de órdenes por estado
  const loadOrdersByStatus = async () => {
    try {
      console.log('🔄 Cargando estadísticas de órdenes...');
      console.log('📅 Filtro de fecha activo:', dateRange);
      setLoading(true);
      
      // Construir URL con parámetro de fecha
      let url = `/api/orders/stats?timeFilter=${dateRange}`;
      if (organizationId) {
        url += `&organizationId=${organizationId}`;
      }
      
      // Si es custom y tiene fechas, agregar parámetros adicionales
      if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
        const fromISO = customDateRange.from.toISOString();
        const toISO = customDateRange.to.toISOString();
        url = `/api/orders/stats?timeFilter=custom&from=${fromISO}&to=${toISO}`;
        if (organizationId) {
          url += `&organizationId=${organizationId}`;
        }
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
      const totalFromAPI = Object.entries(data)
        .filter(([key]) => key !== 'success' && key !== 'total')
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
  };

  // Cargar datos al montar el componente y cuando cambia el filtro de fecha o las fechas personalizadas
  useEffect(() => {
    loadOrdersByStatus();
  }, [dateRange, customDateRange, organizationId]);

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
    pendientes: ordenesPendientes
  });

  // Datos dinámicos para mostrar el dashboard
  const stats = {
    ingresos: 4600, // TODO: Obtener de la API cuando esté disponible
    ordenesActivas: ordenesActivas,
    clientesAtendidos: 8, // TODO: Obtener de la API cuando esté disponible
    alertasInventario: 9, // TODO: Obtener de la API cuando esté disponible
    ordenesPendientes: ordenesPendientes,
    ordenesCompletadas: ordenesCompletadas
  };

  // Datos para las gráficas
  const incomeData = [
    { date: 'Lun', ingresos: 4000, ordenes: 2 },
    { date: 'Mar', ingresos: 3000, ordenes: 1 },
    { date: 'Mié', ingresos: 2000, ordenes: 3 },
    { date: 'Jue', ingresos: 2780, ordenes: 2 },
    { date: 'Vie', ingresos: 1890, ordenes: 1 },
    { date: 'Sáb', ingresos: 2390, ordenes: 2 },
    { date: 'Dom', ingresos: 3490, ordenes: 4 }
  ];


  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

  // Texto descriptivo del filtro actual
  const filterDescription = dateRange === '7d' ? 'Últimos 7 días' :
                           dateRange === '30d' ? 'Últimos 30 días' :
                           dateRange === 'current_month' ? 'Mes actual' :
                           'Personalizado';

  const kpiCards = [
    {
      title: 'Ingresos del Mes',
      value: `$${stats.ingresos.toLocaleString()}`,
      description: 'Total facturado',
      trend: '↓ 15.1% vs mes anterior',
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Órdenes Activas',
      value: stats.ordenesActivas.toString(),
      description: `En proceso (${filterDescription})`,
      trend: `Total: ${totalOrdenes} órdenes`,
      icon: Wrench,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Clientes Atendidos',
      value: stats.clientesAtendidos.toString(),
      description: 'Este mes',
      trend: '↑ 0% vs mes anterior',
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Alertas de Inventario',
      value: stats.alertasInventario.toString(),
      description: 'Stock bajo',
      trend: '↑ 0% vs mes anterior',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Órdenes Pendientes',
      value: stats.ordenesPendientes.toString(),
      description: `En recepción (${filterDescription})`,
      trend: '',
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Órdenes Completadas',
      value: stats.ordenesCompletadas.toString(),
      description: `Finalizadas (${filterDescription})`,
      trend: '',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Resumen general de tu taller</p>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {['7d', '30d', 'current_month'].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setCustomDateRange({ from: undefined, to: undefined });
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === '7d' ? 'Últimos 7 días' :
                 range === '30d' ? 'Últimos 30 días' :
                 'Mes actual'}
              </button>
            ))}
            
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    dateRange === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {customDateRange.from && customDateRange.to ? (
                    <>
                      {format(customDateRange.from, 'dd/MM', { locale: es })} - {format(customDateRange.to, 'dd/MM', { locale: es })}
                    </>
                  ) : (
                    'Personalizado'
                  )}
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiCards.map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                    <IconComponent className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  {kpi.trend && (
                    <span className={`text-sm ${kpi.trend.includes('↓') ? 'text-red-400' : 'text-green-400'}`}>
                      {kpi.trend}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
                  <p className="text-gray-400 text-sm">{kpi.title}</p>
                  <p className="text-gray-500 text-xs">{kpi.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráficos y Acciones Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Gráficos (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gráfico de Ingresos */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Ingresos de los Últimos 7 Días</h3>
              <p className="text-gray-400 text-sm mb-4">Tendencia de ingresos y órdenes procesadas</p>
              <div className="h-64">
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
              </div>
            </div>

            {/* Gráfico de Órdenes por Estado */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Órdenes por Estado</h3>
              <p className="text-gray-400 text-sm mb-4">Distribución de órdenes en el flujo de trabajo</p>
              <div className="h-64">
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
                      <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No hay órdenes registradas</p>
                      <p className="text-gray-500 text-xs mt-1">Crea tu primera orden para ver estadísticas</p>
                    </div>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="30%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
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
                      formatter={(value, entry: any) => {
                        const item = ordersByStatus.find(s => s.name === value)
                        return `${value} (${item?.value || 0})`
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Acciones Rápidas (1/3) */}
          <div className="lg:col-span-1">
            <QuickActions onOrderCreated={handleOrderCreated} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}