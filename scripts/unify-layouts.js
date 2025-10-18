#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista de archivos que usan AppLayout
const filesToUpdate = [
  'src/app/page.tsx',
  'src/app/perfil/page.tsx',
  'src/app/reportes/page.tsx',
  'src/app/inventarios/productos/page.tsx',
  'src/app/inventarios/movimientos/page.tsx',
  'src/app/ingresos/facturacion/page.tsx',
  'src/app/cobros/page.tsx',
  'src/app/ingresos/page.tsx',
  'src/app/inventarios/categorias/page.tsx',
  'src/app/inventarios/page.tsx',
  'src/app/dashboard/overview/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/cotizaciones/page.tsx',
  'src/app/compras/page.tsx',
  'src/app/vehiculos/page.tsx',
  'src/app/metricas-rendimiento/page.tsx',
  'src/app/analisis-financiero/page.tsx',
  'src/app/productos/page.tsx',
  'src/app/metricas/page.tsx',
  'src/app/inventario/alerts/page.tsx'
];

function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Archivo no encontrado: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Cambiar import de AppLayout a MainLayout
    if (content.includes("import { AppLayout }")) {
      content = content.replace(
        /import { AppLayout } from ['"][^'"]+['"];/,
        "import { MainLayout } from '@/components/main-layout';"
      );
      hasChanges = true;
      console.log(`✅ Import actualizado en: ${filePath}`);
    }

    // Cambiar uso de AppLayout por MainLayout
    if (content.includes('<AppLayout')) {
      content = content.replace(/<AppLayout/g, '<MainLayout');
      hasChanges = true;
      console.log(`✅ Componente actualizado en: ${filePath}`);
    }

    if (content.includes('</AppLayout>')) {
      content = content.replace(/<\/AppLayout>/g, '</MainLayout>');
      hasChanges = true;
      console.log(`✅ Cierre de componente actualizado en: ${filePath}`);
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`🎉 Archivo actualizado: ${filePath}`);
    } else {
      console.log(`⏭️  Sin cambios en: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

console.log('🚀 Iniciando unificación de layouts...\n');

let updatedCount = 0;
let totalCount = filesToUpdate.length;

filesToUpdate.forEach((filePath) => {
  console.log(`\n📁 Procesando: ${filePath}`);
  updateFile(filePath);
  updatedCount++;
});

console.log(`\n✨ Proceso completado!`);
console.log(`📊 Archivos procesados: ${updatedCount}/${totalCount}`);
console.log('\n🎯 Todos los layouts han sido unificados a MainLayout');
console.log('🔧 Esto eliminará la duplicación de sidebars y logos');
