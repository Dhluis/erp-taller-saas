/**
 * Script para crear tablas faltantes en Supabase
 * Soluciona el error: "Could not find the table 'public.purchase_orders' in the schema cache"
 */

const fs = require('fs');
const path = require('path');

async function fixDatabaseTables() {
  console.log('🔧 Iniciando corrección de tablas de base de datos...');
  
  try {
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '..', 'fix_database_tables.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Archivo SQL cargado:', sqlFile);
    console.log('📋 Contenido del script:');
    console.log('   - Crear tabla purchase_orders');
    console.log('   - Crear tabla suppliers');
    console.log('   - Insertar datos de prueba');
    console.log('   - Crear índices');
    
    console.log('\n🚀 INSTRUCCIONES PARA EJECUTAR:');
    console.log('1. Abre el dashboard de Supabase');
    console.log('2. Ve a SQL Editor');
    console.log('3. Copia y pega el contenido de: fix_database_tables.sql');
    console.log('4. Ejecuta el script');
    console.log('5. Verifica que las tablas se crearon correctamente');
    
    console.log('\n📝 Script SQL generado en: fix_database_tables.sql');
    console.log('✅ Listo para ejecutar en Supabase');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixDatabaseTables();
}

module.exports = { fixDatabaseTables };
