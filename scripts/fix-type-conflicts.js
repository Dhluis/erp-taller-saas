/**
 * Script para resolver conflictos de tipos en archivos de Supabase
 * Elimina interfaces locales conflictivas y usa solo tipos generados
 */

const fs = require('fs');
const path = require('path');

// Archivos que tienen conflictos de tipos
const conflictedFiles = [
  'purchase-orders.ts',
  'system-users.ts'
];

function fixConflictedFile(filePath) {
  console.log(`🔧 Arreglando conflictos en: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remover imports conflictivos
  content = content.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/types\/supabase['"];?\s*\n/g,
    ''
  );
  
  // Remover interfaces locales que conflictúan
  const interfacePattern = /export\s+interface\s+(\w+)\s*{[^}]+}/gs;
  content = content.replace(interfacePattern, (match, interfaceName) => {
    // Solo remover si es un tipo que está en supabase
    const supabaseTypes = ['PurchaseOrder', 'SystemUser', 'PurchaseOrderInsert', 'PurchaseOrderUpdate', 'SystemUserInsert', 'SystemUserUpdate'];
    if (supabaseTypes.includes(interfaceName)) {
      console.log(`  🗑️ Removiendo interfaz local: ${interfaceName}`);
      return `// Interfaz local removida - usando tipo generado: ${interfaceName}`;
    }
    return match;
  });
  
  // Agregar imports correctos al inicio
  const imports = [
    `import { ${path.basename(filePath, '.ts') === 'purchase-orders' ? 'PurchaseOrder, PurchaseOrderInsert, PurchaseOrderUpdate' : 'SystemUser, SystemUserInsert, SystemUserUpdate'} } from '@/types/supabase'`
  ];
  
  // Insertar imports después de los imports existentes
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, ...imports);
  content = lines.join('\n');
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Conflictos resueltos`);
}

function fixAllConflicts() {
  console.log('🚀 Resolviendo conflictos de tipos...');
  
  const supabaseDir = path.join(__dirname, '..', 'src', 'lib', 'supabase');
  
  conflictedFiles.forEach(fileName => {
    const filePath = path.join(supabaseDir, fileName);
    fixConflictedFile(filePath);
  });
  
  console.log('✅ Conflictos resueltos!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixAllConflicts();
}

module.exports = { fixAllConflicts };
