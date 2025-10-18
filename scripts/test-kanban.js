/**
 * 🧪 SCRIPT DE PRUEBA PARA KANBAN
 * 
 * Este script verifica que el Kanban esté funcionando correctamente
 * y que los datos estén en el formato esperado.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 PROBANDO KANBAN DE ÓRDENES');
console.log('==============================');

// Verificar que los archivos existen
const filesToCheck = [
  'src/app/ordenes/kanban/page.tsx',
  'src/app/ordenes/kanban/components/KanbanColumn.tsx',
  'src/app/ordenes/kanban/components/OrderCard.tsx',
  'src/hooks/useWorkOrders.ts',
  'scripts/update-work-orders-status.sql'
];

console.log('\n📁 Verificando archivos...');
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NO ENCONTRADO`);
  }
});

// Verificar que las dependencias están instaladas
console.log('\n📦 Verificando dependencias...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = [
    '@dnd-kit/core',
    '@dnd-kit/sortable',
    '@dnd-kit/utilities',
    '@dnd-kit/modifiers'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} - NO INSTALADO`);
    }
  });
} else {
  console.log('❌ package.json no encontrado');
}

// Verificar estructura del hook
console.log('\n🔧 Verificando hook useWorkOrders...');
const hookPath = path.join(__dirname, '..', 'src', 'hooks', 'useWorkOrders.ts');
if (fs.existsSync(hookPath)) {
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  
  const requiredFunctions = [
    'loadData',
    'updateOrderStatus',
    'customers',
    'vehicles'
  ];
  
  requiredFunctions.forEach(func => {
    if (hookContent.includes(func)) {
      console.log(`✅ Función ${func} encontrada`);
    } else {
      console.log(`❌ Función ${func} - NO ENCONTRADA`);
    }
  });
  
  // Verificar estados del Kanban
  const kanbanStates = [
    'reception',
    'diagnosis', 
    'initial_quote',
    'waiting_approval',
    'disassembly',
    'waiting_parts',
    'assembly',
    'testing',
    'ready'
  ];
  
  console.log('\n🎯 Verificando estados del Kanban...');
  kanbanStates.forEach(state => {
    if (hookContent.includes(state)) {
      console.log(`✅ Estado ${state} encontrado`);
    } else {
      console.log(`❌ Estado ${state} - NO ENCONTRADO`);
    }
  });
} else {
  console.log('❌ useWorkOrders.ts no encontrado');
}

// Verificar página principal
console.log('\n📄 Verificando página Kanban...');
const pagePath = path.join(__dirname, '..', 'src', 'app', 'ordenes', 'kanban', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  
  const requiredImports = [
    '@dnd-kit/core',
    '@dnd-kit/sortable',
    'useWorkOrders',
    'AppLayout',
    'StandardBreadcrumbs'
  ];
  
  requiredImports.forEach(imp => {
    if (pageContent.includes(imp)) {
      console.log(`✅ Import ${imp} encontrado`);
    } else {
      console.log(`❌ Import ${imp} - NO ENCONTRADO`);
    }
  });
  
  // Verificar columnas del Kanban
  const kanbanColumns = [
    'KANBAN_COLUMNS',
    'reception',
    'diagnosis',
    'initial_quote',
    'waiting_approval',
    'disassembly',
    'waiting_parts',
    'assembly',
    'testing',
    'ready'
  ];
  
  console.log('\n🎨 Verificando columnas del Kanban...');
  kanbanColumns.forEach(col => {
    if (pageContent.includes(col)) {
      console.log(`✅ Columna ${col} encontrada`);
    } else {
      console.log(`❌ Columna ${col} - NO ENCONTRADA`);
    }
  });
} else {
  console.log('❌ page.tsx no encontrado');
}

// Verificar componentes
console.log('\n🧩 Verificando componentes...');
const components = [
  'KanbanColumn.tsx',
  'OrderCard.tsx'
];

components.forEach(component => {
  const componentPath = path.join(__dirname, '..', 'src', 'app', 'ordenes', 'kanban', 'components', component);
  if (fs.existsSync(componentPath)) {
    console.log(`✅ ${component}`);
  } else {
    console.log(`❌ ${component} - NO ENCONTRADO`);
  }
});

// Verificar script SQL
console.log('\n🗄️ Verificando script SQL...');
const sqlPath = path.join(__dirname, 'update-work-orders-status.sql');
if (fs.existsSync(sqlPath)) {
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  const requiredSql = [
    'work_orders_status_check',
    'reception',
    'diagnosis',
    'initial_quote',
    'waiting_approval',
    'disassembly',
    'waiting_parts',
    'assembly',
    'testing',
    'ready'
  ];
  
  requiredSql.forEach(sql => {
    if (sqlContent.includes(sql)) {
      console.log(`✅ SQL ${sql} encontrado`);
    } else {
      console.log(`❌ SQL ${sql} - NO ENCONTRADO`);
    }
  });
} else {
  console.log('❌ update-work-orders-status.sql no encontrado');
}

console.log('\n🎯 INSTRUCCIONES DE USO:');
console.log('========================');
console.log('1. Ejecutar script SQL en Supabase:');
console.log('   \\i scripts/update-work-orders-status.sql');
console.log('');
console.log('2. Instalar dependencias si faltan:');
console.log('   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers');
console.log('');
console.log('3. Iniciar servidor de desarrollo:');
console.log('   npm run dev');
console.log('');
console.log('4. Navegar a: http://localhost:3000/ordenes/kanban');
console.log('');
console.log('5. Verificar funcionalidad:');
console.log('   - Cargar órdenes existentes');
console.log('   - Arrastrar órdenes entre columnas');
console.log('   - Verificar actualización de estados');
console.log('   - Probar responsive design');

console.log('\n✅ Verificación completada');
