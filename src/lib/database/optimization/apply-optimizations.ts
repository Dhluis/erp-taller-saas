import { createClient } from '@/lib/supabase/server';

/**
 * Aplica todas las optimizaciones de rendimiento a la base de datos
 * Este script debe ejecutarse después de crear las tablas principales
 */
export async function applyDatabaseOptimizations() {
  const supabase = await createClient();
  
  try {
    console.log('🚀 Iniciando optimizaciones de base de datos...');
    
    // 1. Aplicar índices de rendimiento
    console.log('📊 Aplicando índices de rendimiento...');
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        -- Aplicar todos los índices de rendimiento
        ${await import('./indexes.sql').then(m => m.default)}
      `
    });
    
    if (indexError) {
      console.error('❌ Error aplicando índices:', indexError);
      throw indexError;
    }
    
    console.log('✅ Índices aplicados correctamente');
    
    // 2. Crear vistas optimizadas
    console.log('👁️ Creando vistas optimizadas...');
    const { error: viewError } = await supabase.rpc('execute_sql', {
      sql: `
        -- Aplicar todas las vistas optimizadas
        ${await import('./query-optimization.sql').then(m => m.default)}
      `
    });
    
    if (viewError) {
      console.error('❌ Error creando vistas:', viewError);
      throw viewError;
    }
    
    console.log('✅ Vistas optimizadas creadas correctamente');
    
    // 3. Actualizar estadísticas
    console.log('📈 Actualizando estadísticas de base de datos...');
    const { error: statsError } = await supabase.rpc('execute_sql', {
      sql: `
        ANALYZE;
      `
    });
    
    if (statsError) {
      console.error('❌ Error actualizando estadísticas:', statsError);
      throw statsError;
    }
    
    console.log('✅ Estadísticas actualizadas correctamente');
    
    // 4. Verificar rendimiento
    console.log('🔍 Verificando rendimiento...');
    const { data: performanceStats, error: perfError } = await supabase
      .from('v_dashboard_stats')
      .select('*')
      .limit(1);
    
    if (perfError) {
      console.error('❌ Error verificando rendimiento:', perfError);
      throw perfError;
    }
    
    console.log('✅ Verificación de rendimiento completada');
    
    console.log('🎉 ¡Optimizaciones aplicadas exitosamente!');
    
    return {
      success: true,
      message: 'Optimizaciones aplicadas correctamente',
      performanceStats
    };
    
  } catch (error) {
    console.error('❌ Error aplicando optimizaciones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Verifica el estado de las optimizaciones
 */
export async function checkOptimizationStatus() {
  const supabase = await createClient();
  
  try {
    // Verificar índices existentes
    const { data: indexes, error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname;
      `
    });
    
    if (indexError) {
      throw indexError;
    }
    
    // Verificar vistas optimizadas
    const { data: views, error: viewError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          viewname,
          definition
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname LIKE 'v_%'
        ORDER BY viewname;
      `
    });
    
    if (viewError) {
      throw viewError;
    }
    
    // Verificar estadísticas de rendimiento
    const { data: stats, error: statsError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_rows,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY total_rows DESC;
      `
    });
    
    if (statsError) {
      throw statsError;
    }
    
    return {
      success: true,
      indexes: indexes || [],
      views: views || [],
      tableStats: stats || [],
      summary: {
        totalIndexes: indexes?.length || 0,
        totalViews: views?.length || 0,
        totalTables: stats?.length || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error verificando optimizaciones:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Limpia logs antiguos para mejorar rendimiento
 */
export async function cleanOldLogs(daysToKeep: number = 90) {
  const supabase = await createClient();
  
  try {
    console.log(`🧹 Limpiando logs antiguos (más de ${daysToKeep} días)...`);
    
    const { data, error } = await supabase.rpc('clean_old_logs', {
      days_to_keep: daysToKeep
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Se eliminaron ${data} registros antiguos`);
    
    return {
      success: true,
      deletedRecords: data,
      message: `Se eliminaron ${data} registros antiguos`
    };
    
  } catch (error) {
    console.error('❌ Error limpiando logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene estadísticas de rendimiento del sistema
 */
export async function getPerformanceStats() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase.rpc('get_performance_stats', {
      org_id: 'temp-org-123' // Reemplazar con organization_id real
    });
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      stats: data,
      summary: {
        totalTables: data?.length || 0,
        totalSize: data?.reduce((acc: number, table: any) => 
          acc + parseInt(table.table_size.replace(/[^\d]/g, '')), 0) || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}


















