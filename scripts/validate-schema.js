/**
 * 🔍 VALIDADOR DE SCHEMA.JSON
 * 
 * Este script valida que el archivo SCHEMA.json esté correctamente estructurado
 * y contiene todos los campos necesarios.
 */

const fs = require('fs');
const path = require('path');

// Cargar el esquema
const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'database', 'SCHEMA.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

console.log('🔍 VALIDANDO SCHEMA.JSON');
console.log('========================');

// Validaciones
let isValid = true;
const errors = [];
const warnings = [];

// 1. Verificar estructura básica
if (!schema._meta) {
  errors.push('❌ Falta sección _meta');
  isValid = false;
} else {
  console.log('✅ Sección _meta encontrada');
  console.log(`   Versión: ${schema._meta.version}`);
  console.log(`   Última actualización: ${schema._meta.last_updated}`);
}

if (!schema.tables) {
  errors.push('❌ Falta sección tables');
  isValid = false;
} else {
  const tableCount = Object.keys(schema.tables).length;
  console.log(`✅ Sección tables encontrada (${tableCount} tablas)`);
}

if (!schema.common_errors) {
  warnings.push('⚠️ Falta sección common_errors');
} else {
  console.log(`✅ Sección common_errors encontrada (${schema.common_errors.length} errores documentados)`);
}

// 2. Validar tablas esenciales
const essentialTables = [
  'organizations',
  'customers', 
  'vehicles',
  'work_orders',
  'inventory',
  'inventory_categories',
  'system_users'
];

essentialTables.forEach(tableName => {
  if (!schema.tables[tableName]) {
    errors.push(`❌ Tabla esencial faltante: ${tableName}`);
    isValid = false;
  } else {
    console.log(`✅ Tabla ${tableName} encontrada`);
  }
});

// 3. Validar campos críticos
const criticalFields = {
  'vehicles': ['brand'], // NO 'make'
  'work_orders': ['id', 'organization_id', 'customer_id', 'vehicle_id'],
  'system_users': ['is_active'], // NO 'status'
  'inventory': ['current_stock'], // NO 'quantity'
};

Object.entries(criticalFields).forEach(([tableName, fields]) => {
  if (schema.tables[tableName]) {
    fields.forEach(fieldName => {
      if (!schema.tables[tableName].columns[fieldName]) {
        errors.push(`❌ Campo crítico faltante: ${tableName}.${fieldName}`);
        isValid = false;
      } else {
        console.log(`✅ Campo crítico ${tableName}.${fieldName} encontrado`);
      }
    });
  }
});

// 4. Validar campos deprecated
Object.entries(schema.tables).forEach(([tableName, table]) => {
  Object.entries(table.columns).forEach(([fieldName, field]) => {
    if (field.deprecated) {
      if (!field.use_instead) {
        warnings.push(`⚠️ Campo deprecated ${tableName}.${fieldName} sin use_instead`);
      } else {
        console.log(`✅ Campo deprecated ${tableName}.${fieldName} → usar ${field.use_instead}`);
      }
    }
  });
});

// 5. Validar foreign keys
Object.entries(schema.tables).forEach(([tableName, table]) => {
  if (table.foreign_keys) {
    table.foreign_keys.forEach(fk => {
      if (!fk.column || !fk.references) {
        errors.push(`❌ Foreign key incompleto en ${tableName}: ${JSON.stringify(fk)}`);
        isValid = false;
      } else {
        console.log(`✅ FK ${tableName}.${fk.column} → ${fk.references}`);
      }
    });
  }
});

// 6. Validar valores permitidos
Object.entries(schema.tables).forEach(([tableName, table]) => {
  Object.entries(table.columns).forEach(([fieldName, field]) => {
    if (field.values) {
      console.log(`✅ Campo ${tableName}.${fieldName} con valores: ${field.values.join(', ')}`);
    }
  });
});

// 7. Mostrar resumen
console.log('\n📊 RESUMEN DE VALIDACIÓN');
console.log('========================');

if (errors.length > 0) {
  console.log('\n❌ ERRORES ENCONTRADOS:');
  errors.forEach(error => console.log(`   ${error}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ ADVERTENCIAS:');
  warnings.forEach(warning => console.log(`   ${warning}`));
}

if (isValid && warnings.length === 0) {
  console.log('\n✅ SCHEMA.JSON VÁLIDO - Sin errores ni advertencias');
} else if (isValid) {
  console.log('\n✅ SCHEMA.JSON VÁLIDO - Con advertencias menores');
} else {
  console.log('\n❌ SCHEMA.JSON INVÁLIDO - Requiere correcciones');
  process.exit(1);
}

// 8. Mostrar estadísticas
console.log('\n📈 ESTADÍSTICAS:');
console.log(`   Total de tablas: ${Object.keys(schema.tables).length}`);
console.log(`   Total de campos: ${Object.values(schema.tables).reduce((sum, table) => sum + Object.keys(table.columns).length, 0)}`);
console.log(`   Total de foreign keys: ${Object.values(schema.tables).reduce((sum, table) => sum + (table.foreign_keys?.length || 0), 0)}`);
console.log(`   Errores comunes documentados: ${schema.common_errors?.length || 0}`);

console.log('\n🎯 RECOMENDACIONES:');
console.log('   - Revisar campos deprecated y migrar a los nuevos');
console.log('   - Verificar que todas las foreign keys sean correctas');
console.log('   - Mantener el archivo actualizado con cambios en BD');
console.log('   - Usar este archivo como referencia antes de escribir queries');

console.log('\n✅ Validación completada exitosamente');
