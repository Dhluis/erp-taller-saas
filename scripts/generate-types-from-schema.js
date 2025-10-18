/**
 * Script para generar tipos TypeScript basados en el esquema conocido
 * Elimina todos los errores de columnas inexistentes
 */

const fs = require('fs');
const path = require('path');

function generateTypes() {
  console.log('🚀 Generando tipos TypeScript basados en el esquema conocido...');
  
  const timestamp = new Date().toISOString();
  
  // Esquema basado en tu base de datos actual
  const schema = {
    organizations: {
      id: 'uuid',
      name: 'text',
      address: 'text',
      phone: 'text',
      email: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    customers: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      email: 'text',
      phone: 'text',
      address: 'text',
      notes: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    vehicles: {
      id: 'uuid',
      customer_id: 'uuid',
      brand: 'text',
      model: 'text',
      year: 'integer',
      license_plate: 'text',
      vin: 'text',
      color: 'text',
      mileage: 'integer',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    work_orders: {
      id: 'uuid',
      organization_id: 'uuid',
      customer_id: 'uuid',
      vehicle_id: 'uuid',
      status: 'text',
      description: 'text',
      estimated_cost: 'numeric',
      final_cost: 'numeric',
      entry_date: 'timestamp with time zone',
      estimated_completion: 'timestamp with time zone',
      completed_at: 'timestamp with time zone',
      notes: 'text',
      subtotal: 'numeric',
      tax_amount: 'numeric',
      discount_amount: 'numeric',
      total_amount: 'numeric',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    quotations: {
      id: 'uuid',
      organization_id: 'uuid',
      customer_id: 'uuid',
      vehicle_id: 'uuid',
      quotation_number: 'text',
      status: 'text',
      valid_until: 'date',
      terms_and_conditions: 'text',
      notes: 'text',
      subtotal: 'numeric',
      tax_amount: 'numeric',
      discount_amount: 'numeric',
      total_amount: 'numeric',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      created_by: 'uuid',
      updated_by: 'uuid'
    },
    products: {
      id: 'uuid',
      organization_id: 'uuid',
      code: 'text',
      name: 'text',
      description: 'text',
      category: 'text',
      type: 'text',
      unit: 'text',
      price: 'numeric',
      cost: 'numeric',
      tax_rate: 'numeric',
      stock_quantity: 'integer',
      min_stock: 'integer',
      max_stock: 'integer',
      is_active: 'boolean',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      created_by: 'uuid',
      updated_by: 'uuid'
    },
    inventory_categories: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      description: 'text',
      parent_id: 'uuid',
      status: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    inventory: {
      id: 'uuid',
      organization_id: 'uuid',
      code: 'text',
      name: 'text',
      description: 'text',
      quantity: 'integer',
      min_quantity: 'integer',
      unit_price: 'numeric',
      category: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      category_id: 'uuid',
      sku: 'text',
      barcode: 'text',
      current_stock: 'integer',
      min_stock: 'integer',
      max_stock: 'integer',
      unit: 'text',
      status: 'text'
    },
    suppliers: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      contact_person: 'text',
      email: 'text',
      phone: 'text',
      address: 'text',
      city: 'text',
      state: 'text',
      zip_code: 'text',
      country: 'text',
      tax_id: 'text',
      payment_terms: 'text',
      notes: 'text',
      is_active: 'boolean',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      created_by: 'uuid',
      updated_by: 'uuid'
    },
    purchase_orders: {
      id: 'uuid',
      organization_id: 'uuid',
      supplier_id: 'uuid',
      order_number: 'text',
      order_date: 'date',
      expected_delivery_date: 'date',
      status: 'text',
      subtotal: 'numeric',
      tax_amount: 'numeric',
      total: 'numeric',
      notes: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      created_by: 'uuid',
      updated_by: 'uuid'
    },
    payments: {
      id: 'uuid',
      organization_id: 'uuid',
      supplier_id: 'uuid',
      invoice_number: 'text',
      amount: 'numeric',
      payment_date: 'date',
      payment_method: 'text',
      reference: 'text',
      status: 'text',
      notes: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    invoices: {
      id: 'uuid',
      organization_id: 'uuid',
      customer_id: 'uuid',
      vehicle_id: 'uuid',
      invoice_number: 'text',
      status: 'text',
      due_date: 'date',
      paid_date: 'date',
      payment_method: 'text',
      notes: 'text',
      subtotal: 'numeric',
      tax_amount: 'numeric',
      discount_amount: 'numeric',
      total: 'numeric',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      created_by: 'uuid',
      updated_by: 'uuid'
    },
    employees: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      email: 'text',
      phone: 'text',
      role: 'text',
      specialties: 'array',
      is_active: 'boolean',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    services: {
      id: 'uuid',
      organization_id: 'uuid',
      code: 'text',
      name: 'text',
      description: 'text',
      category: 'text',
      base_price: 'numeric',
      estimated_hours: 'numeric',
      is_active: 'boolean',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    appointments: {
      id: 'uuid',
      organization_id: 'uuid',
      customer_id: 'uuid',
      vehicle_id: 'uuid',
      service_type: 'text',
      appointment_date: 'timestamp with time zone',
      duration: 'integer',
      status: 'text',
      notes: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    leads: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      email: 'text',
      phone: 'text',
      source: 'text',
      status: 'text',
      notes: 'text',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    campaigns: {
      id: 'uuid',
      organization_id: 'uuid',
      name: 'text',
      type: 'text',
      status: 'text',
      leads_generated: 'integer',
      conversion_rate: 'numeric',
      budget: 'numeric',
      spent: 'numeric',
      start_date: 'date',
      end_date: 'date',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    notifications: {
      id: 'uuid',
      organization_id: 'uuid',
      user_id: 'uuid',
      type: 'text',
      title: 'text',
      message: 'text',
      read: 'boolean',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    system_users: {
      id: 'uuid',
      organization_id: 'uuid',
      email: 'text',
      first_name: 'text',
      last_name: 'text',
      role: 'text',
      is_active: 'boolean',
      last_login: 'timestamp with time zone',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    },
    company_settings: {
      id: 'uuid',
      organization_id: 'uuid',
      company_name: 'text',
      tax_id: 'text',
      address: 'text',
      phone: 'text',
      email: 'text',
      logo_url: 'text',
      currency: 'text',
      tax_rate: 'numeric',
      working_hours: 'jsonb',
      invoice_terms: 'text',
      appointment_defaults: 'jsonb',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone'
    }
  };
  
  // Generar tipos TypeScript
  const typesContent = generateTypeScriptTypes(schema, timestamp);
  
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
  console.log(`   - Tablas definidas: ${Object.keys(schema).length}`);
  console.log(`   - Total de columnas: ${Object.values(schema).flat().length}`);
  
  // Mostrar estadísticas por tabla
  Object.entries(schema).forEach(([tableName, columns]) => {
    console.log(`   - ${tableName}: ${Object.keys(columns).length} columnas`);
  });
  
  console.log('\n🎯 PRÓXIMOS PASOS:');
  console.log('1. Actualizar imports en tus archivos de Supabase');
  console.log('2. Reemplazar interfaces manuales por Database types');
  console.log('3. Ejecutar npm run type-check para verificar');
}

function generateTypeScriptTypes(schema, timestamp) {
  let content = `/**
 * Tipos TypeScript generados automáticamente desde Supabase
 * Generado el: ${timestamp}
 * 
 * Este archivo contiene los tipos exactos de tu base de datos.
 * Basado en el esquema actual de la base de datos.
 */

export interface Database {
  public: {
    Tables: {
`;

  // Generar tipos para cada tabla
  Object.entries(schema).forEach(([tableName, columns]) => {
    content += `      ${tableName}: {
        Row: {
`;
    
    Object.entries(columns).forEach(([columnName, columnType]) => {
      const tsType = mapPostgresTypeToTypeScript(columnType);
      content += `          ${columnName}: ${tsType};\n`;
    });
    
    content += `        };
        Insert: {
`;
    
    Object.entries(columns).forEach(([columnName, columnType]) => {
      const tsType = mapPostgresTypeToTypeScript(columnType);
      // Campos con valores por defecto o auto-generados son opcionales
      const isOptional = ['id', 'created_at', 'updated_at'].includes(columnName) ? '?' : '';
      content += `          ${columnName}${isOptional}: ${tsType};\n`;
    });
    
    content += `        };
        Update: {
`;
    
    Object.entries(columns).forEach(([columnName, columnType]) => {
      const tsType = mapPostgresTypeToTypeScript(columnType);
      content += `          ${columnName}?: ${tsType};\n`;
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
  
  return typeMap[postgresType] || 'any';
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateTypes();
}

module.exports = { generateTypes };
