import { getSupabaseClient } from '@/lib/supabase/client';

// Debug temporal
console.log('🔍 [DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('🔍 [DEBUG] ANON_KEY existe:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
console.log('🔍 [DEBUG] ANON_KEY primeros 20 chars:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20))

const supabase = getSupabaseClient();

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

// Función para verificar la conexión a Supabase
export async function verificarConexionSupabase() {
  console.log('🔌 [verificarConexion] Verificando conexión a Supabase...');
  
  try {
    // Intentar hacer una query simple a cualquier tabla del sistema
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .limit(1);
    
    console.log('🔍 [verificarConexion] Query result:', { data, error });
    
    if (error) {
      console.error('❌ [verificarConexion] Error al conectar:', JSON.stringify(error, null, 2));
      console.error('❌ [verificarConexion] Error completo:', error);
      return false;
    }
    
    console.log('✅ [verificarConexion] Conexión exitosa a Supabase');
    console.log('✅ [verificarConexion] Datos de prueba:', data);
    return true;
  } catch (err) {
    console.error('❌ [verificarConexion] Excepción:', err);
    return false;
  }
}

export interface DashboardStats {
  ingresosDelMes: number;
  ordenesActivas: number;
  clientesAtendidos: number;
  alertasInventario: number;
  ordenesPendientes: number;
  ordenesCompletadas: number;
  totalVehiculos: number;
  tendencias: {
    ingresos: number;
    ordenes: number;
    clientes: number;
    inventario: number;
  };
}

export interface IngresoDiario {
  fecha: string;
  ingresos: number;
  ordenes: number;
}

export interface OrdenPorEstado {
  estado: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

export interface DashboardCharts {
  ingresosPorDia: IngresoDiario[];
  ordenesPorEstado: OrdenPorEstado[];
}

// Obtener ingresos del mes actual
export async function getIngresosDelMes(
  organizationId: string, 
  startDate: Date, 
  endDate: Date
) {
  console.log('🔍 [getIngresosDelMes] Iniciando con organizationId:', organizationId);
  console.log('📅 [getIngresosDelMes] Rango:', startDate.toISOString(), 'hasta', endDate.toISOString());
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('total_amount, status')
    .eq('organization_id', organizationId)
    .in('status', ['completed', 'delivered'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('❌ [getIngresosDelMes] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getIngresosDelMes] Error completo:', error);
    throw error;
  }

  console.log('✅ [getIngresosDelMes] Datos obtenidos:', data?.length, 'registros');

  const total = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  console.log('💰 [getIngresosDelMes] Total calculado:', total);
  
  return total;
}

// Obtener número de órdenes activas
export async function getOrdenesActivas(organizationId: string) {
  console.log('🔍 [getOrdenesActivas] Iniciando con organizationId:', organizationId);
  
  const { count, error } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'in_progress', 'diagnosed', 'approved', 'in_repair', 'waiting_parts']);

  if (error) {
    console.error('❌ [getOrdenesActivas] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getOrdenesActivas] Error completo:', error);
    throw error;
  }
  
  console.log('✅ [getOrdenesActivas] Órdenes activas encontradas:', count);
  return count || 0;
}

// Obtener clientes atendidos este mes
export async function getClientesAtendidosDelMes(
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  console.log('🔍 [getClientesAtendidosDelMes] Iniciando con organizationId:', organizationId);
  console.log('📅 [getClientesAtendidosDelMes] Rango:', startDate.toISOString(), 'hasta', endDate.toISOString());

  const { data, error } = await supabase
    .from('work_orders')
    .select('customer_id')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('❌ [getClientesAtendidosDelMes] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getClientesAtendidosDelMes] Error completo:', error);
    throw error;
  }

  console.log('✅ [getClientesAtendidosDelMes] Órdenes obtenidas:', data?.length, 'registros');

  // Contar clientes únicos
  const clientesUnicos = new Set(data?.map(order => order.customer_id) || []);
  console.log('👥 [getClientesAtendidosDelMes] Clientes únicos:', clientesUnicos.size);
  
  return clientesUnicos.size;
}

// Obtener alertas de inventario (productos con stock bajo)
export async function getAlertasInventario(organizationId: string) {
  console.log('🔍 [getAlertasInventario] Iniciando con organizationId:', organizationId);
  
  const { data, error } = await supabase
    .from('inventory')
    .select('id, quantity, min_quantity')
    .eq('organization_id', organizationId);
  
  if (error) {
    console.error('❌ [getAlertasInventario] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getAlertasInventario] Error completo:', error);
    throw error;
  }
  
  // Filtrar productos donde quantity <= min_quantity
  const count = data?.filter(item => item.quantity <= (item.min_quantity || 0)).length || 0;
  
  console.log('⚠️ [getAlertasInventario] Productos con stock bajo:', count);
  return count || 0;
}

// Obtener órdenes pendientes
export async function getOrdenesPendientes(organizationId: string) {
  console.log('🔍 [getOrdenesPendientes] Iniciando con organizationId:', organizationId);
  
  console.log('📊 [getOrdenesPendientes] Ejecutando query a work_orders...');
  console.log('📊 [getOrdenesPendientes] Filtrando por status: pending');
  console.log('📊 [getOrdenesPendientes] Filtrando por organization_id:', organizationId);
  
  const { count, error } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  if (error) {
    console.error('❌ [getOrdenesPendientes] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getOrdenesPendientes] Error completo:', error);
    throw error;
  }
  
  console.log('⏳ [getOrdenesPendientes] Órdenes pendientes:', count);
  return count || 0;
}

// Obtener órdenes completadas
export async function getOrdenesCompletadas(organizationId: string) {
  console.log('🔍 [getOrdenesCompletadas] Iniciando con organizationId:', organizationId);
  
  const { count, error } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'completed');

  if (error) {
    console.error('❌ [getOrdenesCompletadas] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getOrdenesCompletadas] Error completo:', error);
    throw error;
  }
  
  console.log('✅ [getOrdenesCompletadas] Órdenes completadas:', count);
  return count || 0;
}

// Obtener total de vehículos registrados
export async function getTotalVehiculos(organizationId: string) {
  console.log('🔍 [getTotalVehiculos] Iniciando con organizationId:', organizationId);
  
  try {
    // Como vehicles no tiene organization_id, contamos a través de customers
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, customer_id, customers!inner(organization_id)')
      .eq('customers.organization_id', organizationId);

    if (error) {
      console.warn('⚠️ [getTotalVehiculos] Error de Supabase (no crítico):', JSON.stringify(error, null, 2));
      console.warn('⚠️ [getTotalVehiculos] Retornando 0 por defecto');
      return 0;
    }
    
    const count = data?.length || 0;
    console.log('✅ [getTotalVehiculos] Total de vehículos:', count);
    return count;
    
  } catch (err) {
    console.warn('⚠️ [getTotalVehiculos] Excepción capturada:', err);
    console.warn('⚠️ [getTotalVehiculos] Retornando 0 por defecto');
    return 0;
  }
}

// Calcular tendencia comparando con mes anterior
async function calcularTendencia(
  valorActual: number,
  organizationId: string,
  tabla: string,
  campo: string
): Promise<number> {
  const now = new Date();
  const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0);

  const { data, error } = await supabase
    .from(tabla)
    .select(campo)
    .eq('organization_id', organizationId)
    .gte('created_at', primerDiaMesAnterior.toISOString())
    .lte('created_at', ultimoDiaMesAnterior.toISOString());

  if (error) {
    console.error('❌ [calcularTendencia] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [calcularTendencia] Error completo:', error);
    return 0;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ [calcularTendencia] No hay datos para comparar, retornando 0');
    return 0;
  }

  const valorAnterior = data.reduce((sum, item) => sum + (item[campo] || 0), 0);
  
  if (valorAnterior === 0) return 0;
  
  const tendencia = ((valorActual - valorAnterior) / valorAnterior) * 100;
  return Math.round(tendencia * 10) / 10; // Redondear a 1 decimal
}

// Obtener ingresos de los últimos 7 días
export async function getIngresosPorDia(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<IngresoDiario[]> {
  console.log('🔍 [getIngresosPorDia] Iniciando con organizationId:', organizationId);
  console.log('📅 [getIngresosPorDia] Rango:', startDate.toISOString(), 'hasta', endDate.toISOString());

  const { data, error } = await supabase
    .from('work_orders')
    .select('created_at, total_amount, status')
    .eq('organization_id', organizationId)
    .in('status', ['completed', 'delivered'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [getIngresosPorDia] Error:', JSON.stringify(error, null, 2));
    throw error;
  }

  // Calcular días entre startDate y endDate
  const dias = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log('📊 [getIngresosPorDia] Generando', dias, 'días');
  
  // Inicializar todos los días del rango con 0
  const ingresosPorDia: { [key: string]: { ingresos: number; ordenes: number } } = {};
  
  for (let i = 0; i < dias; i++) {
    const fecha = new Date(startDate);
    fecha.setDate(startDate.getDate() + i);
    const key = fecha.toISOString().split('T')[0];
    ingresosPorDia[key] = { ingresos: 0, ordenes: 0 };
  }

  // Sumar ingresos por día
  data?.forEach(order => {
    const fecha = new Date(order.created_at).toISOString().split('T')[0];
    if (ingresosPorDia[fecha]) {
      ingresosPorDia[fecha].ingresos += order.total_amount || 0;
      ingresosPorDia[fecha].ordenes += 1;
    }
  });

  // Convertir a array y formatear fechas
  return Object.entries(ingresosPorDia).map(([fecha, datos]) => ({
    fecha: new Date(fecha).toLocaleDateString('es-MX', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    }),
    ingresos: Math.round(datos.ingresos),
    ordenes: datos.ordenes
  }));
}

// Obtener órdenes agrupadas por estado
export async function getOrdenesPorEstado(organizationId: string): Promise<OrdenPorEstado[]> {
  console.log('🔍 [getOrdenesPorEstado] Iniciando con organizationId:', organizationId);
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('status')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('❌ [getOrdenesPorEstado] Error de Supabase:', JSON.stringify(error, null, 2));
    console.error('❌ [getOrdenesPorEstado] Error completo:', error);
    throw error;
  }
  
  console.log('✅ [getOrdenesPorEstado] Órdenes obtenidas:', data?.length, 'registros');

  // Contar órdenes por estado
  const conteo: { [key: string]: number } = {};
  data?.forEach(order => {
    conteo[order.status] = (conteo[order.status] || 0) + 1;
  });

  const total = data?.length || 0;

  // Mapeo de estados con colores
  const estadosConfig: { [key: string]: { label: string; color: string } } = {
    pending: { label: 'Pendiente', color: '#fbbf24' },
    in_progress: { label: 'En Proceso', color: '#3b82f6' },
    diagnosed: { label: 'Diagnosticado', color: '#8b5cf6' },
    approved: { label: 'Aprobado', color: '#10b981' },
    in_repair: { label: 'En Reparación', color: '#06b6d4' },
    waiting_parts: { label: 'Esperando Piezas', color: '#f59e0b' },
    completed: { label: 'Completado', color: '#22c55e' },
    delivered: { label: 'Entregado', color: '#14b8a6' }
  };

  return Object.entries(conteo).map(([estado, cantidad]) => ({
    estado: estadosConfig[estado]?.label || estado,
    cantidad,
    porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0,
    color: estadosConfig[estado]?.color || '#6b7280'
  }));
}

// Función principal que obtiene todas las estadísticas
export async function getDashboardStats(
  organizationId: string, 
  dateRange?: DateRangeParams
): Promise<DashboardStats & { charts: DashboardCharts }> {
  console.log('🚀 [getDashboardStats] Iniciando dashboard stats para organizationId:', organizationId);
  
  console.log('🔑 [getDashboardStats] Tipo de organizationId:', typeof organizationId);
  console.log('🔑 [getDashboardStats] Longitud:', organizationId.length);
  console.log('🔑 [getDashboardStats] Valor:', organizationId);

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(organizationId)) {
    console.error('❌ organizationId no es un UUID válido');
    throw new Error('organizationId debe ser un UUID válido');
  }

  // Si no se proporciona rango, usar mes actual por defecto
  const now = new Date();
  const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = dateRange?.endDate || now;

  console.log('📅 [getDashboardStats] Rango de fechas:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });
  
  // Verificar conexión primero
  const conexionOk = await verificarConexionSupabase();
  if (!conexionOk) {
    throw new Error('No se pudo conectar a Supabase. Verifica tus credenciales.');
  }
  
  try {
    console.log('📊 [getDashboardStats] Ejecutando todas las queries en paralelo...');
    
    const [ingresos, ordenes, clientes, alertas, pendientes, completadas, totalVehiculos, ingresosPorDia, ordenesPorEstado] = await Promise.all([
      getIngresosDelMes(organizationId, startDate, endDate),
      getOrdenesActivas(organizationId),
      getClientesAtendidosDelMes(organizationId, startDate, endDate),
      getAlertasInventario(organizationId),
      getOrdenesPendientes(organizationId),
      getOrdenesCompletadas(organizationId),
      getTotalVehiculos(organizationId),
      getIngresosPorDia(organizationId, startDate, endDate),
      getOrdenesPorEstado(organizationId)
    ]);

    console.log('📈 [getDashboardStats] Calculando tendencia de ingresos...');
    const tendenciaIngresos = await calcularTendencia(ingresos, organizationId, 'work_orders', 'total_amount');
    
    const result = {
      ingresosDelMes: ingresos,
      ordenesActivas: ordenes,
      clientesAtendidos: clientes,
      alertasInventario: alertas,
      ordenesPendientes: pendientes,
      ordenesCompletadas: completadas,
      totalVehiculos: totalVehiculos,
      tendencias: {
        ingresos: tendenciaIngresos,
        ordenes: 0, // Se puede calcular después
        clientes: 0, // Se puede calcular después
        inventario: 0 // Se puede calcular después
      },
      charts: {
        ingresosPorDia,
        ordenesPorEstado
      }
    };
    
    console.log('✅ [getDashboardStats] Dashboard stats completadas exitosamente:', {
      ingresos: result.ingresosDelMes,
      ordenesActivas: result.ordenesActivas,
      clientes: result.clientesAtendidos,
      alertas: result.alertasInventario,
      pendientes: result.ordenesPendientes,
      completadas: result.ordenesCompletadas,
      tendenciaIngresos: result.tendencias.ingresos,
      chartData: {
        ingresosPorDia: result.charts.ingresosPorDia.length,
        ordenesPorEstado: result.charts.ordenesPorEstado.length
      }
    });
    
    return result;
  } catch (error) {
    console.error('❌ [getDashboardStats] Error al obtener estadísticas del dashboard:', error);
    console.error('❌ [getDashboardStats] OrganizationId:', organizationId);
    console.error('❌ [getDashboardStats] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}
