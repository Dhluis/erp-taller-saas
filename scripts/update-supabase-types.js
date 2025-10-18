/**
 * Script para actualizar todos los archivos de Supabase con los tipos generados
 * Reemplaza interfaces manuales por tipos generados automáticamente
 */

const fs = require('fs');
const path = require('path');

// Mapeo de archivos y sus tipos correspondientes
const typeMappings = {
  'customers.ts': ['Customer', 'CustomerInsert', 'CustomerUpdate'],
  'vehicles.ts': ['Vehicle', 'VehicleInsert', 'VehicleUpdate'],
  'work-orders.ts': ['WorkOrder', 'WorkOrderInsert', 'WorkOrderUpdate'],
  'quotations.ts': ['Quotation', 'QuotationInsert', 'QuotationUpdate'],
  'products.ts': ['Product', 'ProductInsert', 'ProductUpdate'],
  'inventory-categories.ts': ['InventoryCategory', 'InventoryCategoryInsert', 'InventoryCategoryUpdate'],
  'inventory-products.ts': ['Product', 'ProductInsert', 'ProductUpdate'],
  'suppliers.ts': ['Supplier', 'SupplierInsert', 'SupplierUpdate'],
  'purchase-orders.ts': ['PurchaseOrder', 'PurchaseOrderInsert', 'PurchaseOrderUpdate'],
  'payments.ts': ['Payment', 'PaymentInsert', 'PaymentUpdate'],
  'invoices.ts': ['Invoice', 'InvoiceInsert', 'InvoiceUpdate'],
  'employees.ts': ['Employee', 'EmployeeInsert', 'EmployeeUpdate'],
  'services.ts': ['Service', 'ServiceInsert', 'ServiceUpdate'],
  'appointments.ts': ['Appointment', 'AppointmentInsert', 'AppointmentUpdate'],
  'leads.ts': ['Lead', 'LeadInsert', 'LeadUpdate'],
  'campaigns.ts': ['Campaign', 'CampaignInsert', 'CampaignUpdate'],
  'notifications.ts': ['Notification', 'NotificationInsert', 'NotificationUpdate'],
  'system-users.ts': ['SystemUser', 'SystemUserInsert', 'SystemUserUpdate'],
  'company-settings.ts': ['CompanySetting', 'CompanySettingInsert', 'CompanySettingUpdate']
};

function updateFile(filePath, types) {
  console.log(`📝 Actualizando: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Buscar imports existentes de tipos
  const existingImportMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/types\/supabase['"];?/);
  
  if (existingImportMatch) {
    // Actualizar import existente
    const existingTypes = existingImportMatch[1].split(',').map(t => t.trim());
    const allTypes = [...new Set([...existingTypes, ...types])];
    
    content = content.replace(
      existingImportMatch[0],
      `import { ${allTypes.join(', ')} } from '@/types/supabase'`
    );
  } else {
    // Agregar nuevo import después de los imports existentes
    const importLines = content.split('\n');
    let insertIndex = 0;
    
    // Encontrar la última línea de import
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (importLines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    const newImport = `import { ${types.join(', ')} } from '@/types/supabase'`;
    importLines.splice(insertIndex, 0, newImport);
    content = importLines.join('\n');
  }
  
  // Buscar y reemplazar interfaces manuales
  const interfacePattern = /export\s+interface\s+(\w+)\s*{[^}]+}/gs;
  const interfaces = content.match(interfacePattern);
  
  if (interfaces) {
    interfaces.forEach(interfaceMatch => {
      const interfaceName = interfaceMatch.match(/export\s+interface\s+(\w+)/)[1];
      
      // Si el tipo está en nuestros tipos generados, reemplazar
      if (types.includes(interfaceName)) {
        console.log(`  🔄 Reemplazando interfaz: ${interfaceName}`);
        content = content.replace(interfaceMatch, `// Re-exportar tipo generado: ${interfaceName}`);
      }
    });
  }
  
  // Agregar re-export si no existe
  const reExportPattern = new RegExp(`export\\s+type\\s*{\\s*${types.join('|')}\\s*}`);
  if (!reExportPattern.test(content)) {
    const reExportLine = `\n// Re-exportar tipos generados\nexport type { ${types.join(', ')} }`;
    
    // Insertar después de los imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, reExportLine);
    content = lines.join('\n');
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Actualizado exitosamente`);
}

function updateAllFiles() {
  console.log('🚀 Iniciando actualización de tipos en archivos de Supabase...');
  
  const supabaseDir = path.join(__dirname, '..', 'src', 'lib', 'supabase');
  
  if (!fs.existsSync(supabaseDir)) {
    console.error('❌ Directorio de Supabase no encontrado:', supabaseDir);
    return;
  }
  
  let updatedCount = 0;
  
  Object.entries(typeMappings).forEach(([fileName, types]) => {
    const filePath = path.join(supabaseDir, fileName);
    updateFile(filePath, types);
    updatedCount++;
  });
  
  console.log(`\n✅ Actualización completada!`);
  console.log(`📊 Archivos actualizados: ${updatedCount}`);
  console.log(`🎯 Tipos generados aplicados a todos los archivos de Supabase`);
  
  console.log('\n🔄 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar: npm run type-check');
  console.log('2. Verificar que no hay errores de TypeScript');
  console.log('3. Probar funcionalidades en el navegador');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateAllFiles();
}

module.exports = { updateAllFiles };
