/**
 * Script para actualizar imports en archivos de Supabase
 * Cambia de @/types/supabase a @/types/supabase-simple
 */

const fs = require('fs');
const path = require('path');

function updateImportsInFile(filePath) {
  console.log(`📝 Actualizando imports en: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar import de supabase por supabase-simple
  content = content.replace(
    /from\s+['"]@\/types\/supabase['"]/g,
    "from '@/types/supabase-simple'"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Imports actualizados`);
}

function updateAllImports() {
  console.log('🚀 Actualizando imports en archivos de Supabase...');
  
  const supabaseDir = path.join(__dirname, '..', 'src', 'lib', 'supabase');
  
  if (!fs.existsSync(supabaseDir)) {
    console.error('❌ Directorio de Supabase no encontrado:', supabaseDir);
    return;
  }
  
  // Obtener todos los archivos .ts en el directorio
  const files = fs.readdirSync(supabaseDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => path.join(supabaseDir, file));
  
  let updatedCount = 0;
  
  files.forEach(filePath => {
    updateImportsInFile(filePath);
    updatedCount++;
  });
  
  console.log(`\n✅ Actualización completada!`);
  console.log(`📊 Archivos actualizados: ${updatedCount}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateAllImports();
}

module.exports = { updateAllImports };
