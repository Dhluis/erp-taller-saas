/**
 * 🔍 SCRIPT SIMPLE PARA OBTENER ESQUEMA REAL DE SUPABASE
 * 
 * Este script ejecuta consultas SQL en Supabase para obtener
 * el esquema real de la base de datos.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (cambiar por tus valores reales)
const supabaseUrl = 'https://your-project.supabase.co'; // CAMBIAR POR TU URL
const supabaseKey = 'your-anon-key'; // CAMBIAR POR TU KEY

// O usar variables de entorno si están disponibles
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseKey;

if (SUPABASE_URL === 'https://your-project.supabase.co' || SUPABASE_KEY === 'your-anon-key') {
  console.error('❌ Error: Configura las variables de Supabase en el script');
  console.error('Edita scripts/get-schema-simple.js y cambia:');
  console.error('- supabaseUrl por tu URL real');
  console.error('- supabaseKey por tu key real');
  console.error('');
  console.error('O configura las variables de entorno:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=tu_url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * 🔍 Obtener información de columnas usando consulta SQL directa
 */
async function getColumns() {
  console.log('🔍 Obteniendo información de columnas...');
  
  try {
    // Usar rpc para consulta SQL directa
    const { data, error } = await supabase.rpc('get_columns_info');
    
    if (error) {
      console.error('❌ Error obteniendo columnas:', error);
      console.log('🔄 Intentando consulta alternativa...');
      
      // Consulta alternativa usando from
      const { data: altData, error: altError } = await supabase
        .from('information_schema.columns')
        .select(`
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        `)
        .eq('table_schema', 'public')
        .order('table_name');

      if (altError) {
        console.error('❌ Error en consulta alternativa:', altError);
        return [];
      }

      console.log(`✅ Obtenidas ${altData?.length || 0} columnas (consulta alternativa)`);
      return altData || [];
    }

    console.log(`✅ Obtenidas ${data?.length || 0} columnas`);
    return data || [];
  } catch (error) {
    console.error('❌ Error en consulta de columnas:', error);
    return [];
  }
}

/**
 * 🔍 Obtener información de tablas
 */
async function getTables() {
  console.log('🔍 Obteniendo información de tablas...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (error) {
      console.error('❌ Error obteniendo tablas:', error);
      return [];
    }

    console.log(`✅ Obtenidas ${data?.length || 0} tablas`);
    return data || [];
  } catch (error) {
    console.error('❌ Error en consulta de tablas:', error);
    return [];
  }
}

/**
 * 📊 Generar documentación del esquema
 */
async function generateSchemaDocumentation() {
  console.log('📄 Generando documentación del esquema...');
  
  const columns = await getColumns();
  const tables = await getTables();

  if (columns.length === 0) {
    console.log('⚠️ No se obtuvieron columnas. Verifica la configuración de Supabase.');
    return '# ❌ ERROR: No se pudo obtener el esquema de la base de datos';
  }

  // Agrupar columnas por tabla
  const tablesMap = new Map();
  columns.forEach(col => {
    if (!tablesMap.has(col.table_name)) {
      tablesMap.set(col.table_name, []);
    }
    tablesMap.get(col.table_name).push(col);
  });

  let documentation = `# 📊 ESQUEMA DE BASE DE DATOS - SUPABASE

> **⚠️ IMPORTANTE:** Este documento se genera automáticamente desde la base de datos real.
> 
> **📅 Última actualización:** ${new Date().toLocaleString()}
> 
> **🔧 Para actualizar:** Ejecutar este script

## 📋 RESUMEN DEL ESQUEMA

- **Total de tablas:** ${tablesMap.size}
- **Total de columnas:** ${columns.length}

## 📊 TABLAS DE LA BASE DE DATOS

`;

  // Generar documentación para cada tabla
  Array.from(tablesMap.entries()).forEach(([tableName, tableColumns]) => {
    documentation += `### 🔧 Tabla: ${tableName}
| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
`;

    tableColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'SÍ' : 'NO';
      const defaultValue = col.column_default || 'NULL';
      const description = getColumnDescription(col);
      
      documentation += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${defaultValue} | ${description} |\n`;
    });

    documentation += `\n---\n\n`;
  });

  documentation += `## 🔍 INFORMACIÓN ADICIONAL

### 📝 Convenciones de Naming
- **Primary Keys:** Siempre \`id\` (uuid)
- **Foreign Keys:** \`{table_name}_id\`
- **Timestamps:** \`created_at\`, \`updated_at\`
- **Organization:** Todas las tablas tienen \`organization_id\` para multi-tenancy

### 🔗 Relaciones Principales
- **organizations** → Tabla principal para multi-tenancy
- **user_profiles** → Perfiles de usuarios autenticados
- **customers** → Clientes de la organización
- **vehicles** → Vehículos de los clientes
- **work_orders** → Órdenes de trabajo (core business)

### ⚠️ Consideraciones de Seguridad
- Todas las consultas deben filtrar por \`organization_id\`
- Usar RLS (Row Level Security) en Supabase
- Validar permisos de usuario antes de operaciones

---

**Última actualización:** ${new Date().toLocaleString()}
`;

  return documentation;
}

/**
 * 📝 Generar descripción de columna basada en su tipo y nombre
 */
function getColumnDescription(col) {
  const name = col.column_name;
  const type = col.data_type;

  // Descripciones basadas en nombres comunes
  if (name === 'id') return 'Primary key';
  if (name === 'organization_id') return 'FK a organizations (multi-tenancy)';
  if (name === 'user_id') return 'FK a auth.users';
  if (name === 'customer_id') return 'FK a customers';
  if (name === 'vehicle_id') return 'FK a vehicles';
  if (name === 'work_order_id') return 'FK a work_orders';
  if (name === 'invoice_id') return 'FK a invoices';
  if (name === 'supplier_id') return 'FK a suppliers';
  if (name === 'created_at') return 'Fecha de creación';
  if (name === 'updated_at') return 'Última actualización';
  if (name === 'email') return 'Email del usuario/cliente';
  if (name === 'phone') return 'Teléfono';
  if (name === 'address') return 'Dirección';
  if (name === 'status') return 'Estado del registro';
  if (name === 'name') return 'Nombre';
  if (name === 'description') return 'Descripción';
  if (name === 'amount') return 'Monto';
  if (name === 'price') return 'Precio';
  if (name === 'quantity') return 'Cantidad';
  if (name === 'total_amount') return 'Total del monto';
  if (name === 'subtotal') return 'Subtotal';
  if (name === 'tax_amount') return 'Monto de impuestos';

  // Descripciones basadas en tipo
  if (type === 'uuid') return 'Identificador único';
  if (type === 'text') return 'Texto';
  if (type === 'integer') return 'Número entero';
  if (type === 'numeric') return 'Número decimal';
  if (type === 'boolean') return 'Valor booleano';
  if (type === 'timestamptz') return 'Fecha y hora con zona horaria';
  if (type === 'date') return 'Fecha';

  return 'Campo de datos';
}

/**
 * 🚀 Función principal
 */
async function main() {
  console.log('🚀 Iniciando extracción del esquema de Supabase...');
  console.log(`📡 Conectando a: ${SUPABASE_URL}`);
  
  try {
    const documentation = await generateSchemaDocumentation();
    
    console.log('\n📄 DOCUMENTACIÓN GENERADA:');
    console.log('=====================================');
    console.log(documentation);
    console.log('=====================================');
    
    console.log('\n✅ Documentación generada exitosamente');
    console.log('📝 Copia el contenido anterior y pégalo en src/lib/database/SCHEMA.md');
    
  } catch (error) {
    console.error('❌ Error generando documentación:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getColumns,
  getTables,
  generateSchemaDocumentation
};
