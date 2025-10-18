/**
 * Script para generar tipos TypeScript automáticamente desde Supabase
 * Elimina todos los errores de columnas inexistentes
 */

const fs = require('fs');
const path = require('path');

async function generateTypes() {
  console.log('🚀 Iniciando generación de tipos TypeScript desde Supabase...');
  
  try {
    // Cargar variables de entorno desde .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
    
    // Importar dinámicamente el cliente de Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuración desde variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }
    
    console.log('📡 Conectando a Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener información del esquema
    console.log('🔍 Obteniendo información del esquema...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) {
      throw new Error(`Error obteniendo tablas: ${tablesError.message}`);
    }
    
    console.log(`📊 Encontradas ${tables?.length || 0} tablas`);
    
    // Obtener información de columnas para cada tabla
    const tableSchemas = {};
    
    for (const table of tables || []) {
      const tableName = table.table_name;
      console.log(`🔍 Analizando tabla: ${tableName}`);
      
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');
      
      if (columnsError) {
        console.warn(`⚠️ Error obteniendo columnas de ${tableName}: ${columnsError.message}`);
        continue;
      }
      
      tableSchemas[tableName] = columns || [];
    }
    
    // Generar tipos TypeScript
    console.log('📝 Generando tipos TypeScript...');
    
    const typesContent = generateTypeScriptTypes(tableSchemas);
    
    // Escribir archivo de tipos
    const typesFilePath = path.join(__dirname, '..', 'src', 'types', 'supabase.ts');
    const typesDir = path.dirname(typesFilePath);
    
    // Crear directorio si no existe
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    fs.writeFileSync(typesFilePath, typesContent);
    
    console.log('✅ Tipos generados exitosamente en:', typesFilePath);
    console.log('📊 Resumen:');
    console.log(`   - Tablas analizadas: ${Object.keys(tableSchemas).length}`);
    console.log(`   - Total de columnas: ${Object.values(tableSchemas).flat().length}`);
    
    // Mostrar estadísticas por tabla
    Object.entries(tableSchemas).forEach(([tableName, columns]) => {
      console.log(`   - ${tableName}: ${columns.length} columnas`);
    });
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Actualizar imports en tus archivos de Supabase');
    console.log('2. Reemplazar interfaces manuales por Database types');
    console.log('3. Ejecutar npm run type-check para verificar');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function generateTypeScriptTypes(tableSchemas) {
  const timestamp = new Date().toISOString();
  
  let content = `/**
 * Tipos TypeScript generados automáticamente desde Supabase
 * Generado el: ${timestamp}
 * 
 * Este archivo contiene los tipos exactos de tu base de datos.
 * NO EDITAR MANUALMENTE - Se regenera automáticamente.
 */

export interface Database {
  public: {
    Tables: {
`;

  // Generar tipos para cada tabla
  Object.entries(tableSchemas).forEach(([tableName, columns]) => {
    content += `      ${tableName}: {
        Row: {
`;
    
    columns.forEach(column => {
      const columnName = column.column_name;
      const dataType = mapPostgresTypeToTypeScript(column.data_type);
      const isOptional = column.is_nullable === 'YES' ? '?' : '';
      
      content += `          ${columnName}${isOptional}: ${dataType};\n`;
    });
    
    content += `        };
        Insert: {
`;
    
    columns.forEach(column => {
      const columnName = column.column_name;
      const dataType = mapPostgresTypeToTypeScript(column.data_type);
      const hasDefault = column.column_default !== null;
      const isOptional = (column.is_nullable === 'YES' || hasDefault) ? '?' : '';
      
      content += `          ${columnName}${isOptional}: ${dataType};\n`;
    });
    
    content += `        };
        Update: {
`;
    
    columns.forEach(column => {
      const columnName = column.column_name;
      const dataType = mapPostgresTypeToTypeScript(column.data_type);
      
      content += `          ${columnName}?: ${dataType};\n`;
    });
    
    content += `        };
      };
`;
  });

  content += `    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Tipos de utilidad
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Tipos específicos para tablas principales
export type Customer = Tables<'customers'>;
export type CustomerInsert = TablesInsert<'customers'>;
export type CustomerUpdate = TablesUpdate<'customers'>;

export type Vehicle = Tables<'vehicles'>;
export type VehicleInsert = TablesInsert<'vehicles'>;
export type VehicleUpdate = TablesUpdate<'vehicles'>;

export type WorkOrder = Tables<'work_orders'>;
export type WorkOrderInsert = TablesInsert<'work_orders'>;
export type WorkOrderUpdate = TablesUpdate<'work_orders'>;

export type Quotation = Tables<'quotations'>;
export type QuotationInsert = TablesInsert<'quotations'>;
export type QuotationUpdate = TablesUpdate<'quotations'>;

export type Product = Tables<'products'>;
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;

export type InventoryCategory = Tables<'inventory_categories'>;
export type InventoryCategoryInsert = TablesInsert<'inventory_categories'>;
export type InventoryCategoryUpdate = TablesUpdate<'inventory_categories'>;

export type Supplier = Tables<'suppliers'>;
export type SupplierInsert = TablesInsert<'suppliers'>;
export type SupplierUpdate = TablesUpdate<'suppliers'>;

export type PurchaseOrder = Tables<'purchase_orders'>;
export type PurchaseOrderInsert = TablesInsert<'purchase_orders'>;
export type PurchaseOrderUpdate = TablesUpdate<'purchase_orders'>;

export type Payment = Tables<'payments'>;
export type PaymentInsert = TablesInsert<'payments'>;
export type PaymentUpdate = TablesUpdate<'payments'>;

export type Invoice = Tables<'invoices'>;
export type InvoiceInsert = TablesInsert<'invoices'>;
export type InvoiceUpdate = TablesUpdate<'invoices'>;

export type Employee = Tables<'employees'>;
export type EmployeeInsert = TablesInsert<'employees'>;
export type EmployeeUpdate = TablesUpdate<'employees'>;

export type Service = Tables<'services'>;
export type ServiceInsert = TablesInsert<'services'>;
export type ServiceUpdate = TablesUpdate<'services'>;

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = TablesInsert<'appointments'>;
export type AppointmentUpdate = TablesUpdate<'appointments'>;

export type Lead = Tables<'leads'>;
export type LeadInsert = TablesInsert<'leads'>;
export type LeadUpdate = TablesUpdate<'leads'>;

export type Campaign = Tables<'campaigns'>;
export type CampaignInsert = TablesInsert<'campaigns'>;
export type CampaignUpdate = TablesUpdate<'campaigns'>;

export type Notification = Tables<'notifications'>;
export type NotificationInsert = TablesInsert<'notifications'>;
export type NotificationUpdate = TablesUpdate<'notifications'>;

export type SystemUser = Tables<'system_users'>;
export type SystemUserInsert = TablesInsert<'system_users'>;
export type SystemUserUpdate = TablesUpdate<'system_users'>;

export type CompanySetting = Tables<'company_settings'>;
export type CompanySettingInsert = TablesInsert<'company_settings'>;
export type CompanySettingUpdate = TablesUpdate<'company_settings'>;
`;

  return content;
}

function mapPostgresTypeToTypeScript(postgresType) {
  const typeMap = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'character varying': 'string',
    'char': 'string',
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'boolean': 'boolean',
    'date': 'string',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'time with time zone': 'string',
    'time without time zone': 'string',
    'json': 'any',
    'jsonb': 'any',
    'array': 'any[]',
    'inet': 'string'
  };
  
  // Limpiar el tipo de PostgreSQL
  const cleanType = postgresType.toLowerCase().replace(/\s+/g, ' ').trim();
  
  return typeMap[cleanType] || 'any';
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateTypes();
}

module.exports = { generateTypes };
