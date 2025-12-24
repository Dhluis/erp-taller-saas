/**
 * Script para verificar el token de Vercel y sus permisos
 * 
 * Uso:
 *   VERCEL_TOKEN=tu_token node scripts/vercel-check-token.js
 */

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!VERCEL_TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN no está configurado');
  console.log('\nUso:');
  console.log('  VERCEL_TOKEN=tu_token node scripts/vercel-check-token.js');
  process.exit(1);
}

// Función helper para hacer requests a la API de Vercel
function vercelRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://api.vercel.com');
    
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: json });
          } else {
            reject({ status: res.statusCode, data: json });
          }
        } catch (e) {
          reject({ status: res.statusCode, error: data, parseError: e.message });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({ error: error.message });
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function checkToken() {
  console.log('🔍 Verificando token de Vercel...\n');
  
  try {
    // 1. Verificar usuario autenticado
    console.log('1️⃣ Verificando autenticación...');
    const userResponse = await vercelRequest('/v2/user');
    console.log('   ✅ Token válido');
    console.log(`   👤 Usuario: ${userResponse.data.user.username || userResponse.data.user.name || 'N/A'}`);
    console.log(`   📧 Email: ${userResponse.data.user.email || 'N/A'}\n`);
    
    // 2. Listar proyectos
    console.log('2️⃣ Listando proyectos...');
    const projectsResponse = await vercelRequest('/v9/projects');
    const projects = projectsResponse.data.projects || [];
    console.log(`   ✅ Encontrados ${projects.length} proyecto(s)\n`);
    
    if (projects.length > 0) {
      console.log('   📦 Proyectos:');
      projects.forEach((project, index) => {
        console.log(`      ${index + 1}. ${project.name} (${project.id})`);
        console.log(`         - Último deploy: ${project.updatedAt ? new Date(project.updatedAt).toLocaleString() : 'N/A'}`);
      });
      console.log('');
    }
    
    // 3. Buscar proyecto específico (erp-taller-saas)
    console.log('3️⃣ Buscando proyecto "erp-taller-saas"...');
    const targetProject = projects.find(p => 
      p.name === 'erp-taller-saas' || 
      p.name.toLowerCase().includes('erp') ||
      p.name.toLowerCase().includes('taller')
    );
    
    if (targetProject) {
      console.log(`   ✅ Proyecto encontrado: ${targetProject.name} (${targetProject.id})\n`);
      
      // 4. Listar deployments del proyecto
      console.log('4️⃣ Listando deployments...');
      try {
        const deploymentsResponse = await vercelRequest(`/v6/deployments?projectId=${targetProject.id}&limit=5`);
        const deployments = deploymentsResponse.data.deployments || [];
        console.log(`   ✅ Encontrados ${deployments.length} deployment(s) reciente(s)\n`);
        
        if (deployments.length > 0) {
          console.log('   🚀 Deployments recientes:');
          deployments.forEach((deploy, index) => {
            const state = deploy.readyState || deploy.state || 'UNKNOWN';
            const createdAt = deploy.createdAt ? new Date(deploy.createdAt).toLocaleString() : 'N/A';
            const url = deploy.url || 'N/A';
            console.log(`      ${index + 1}. ${deploy.id.substring(0, 12)}...`);
            console.log(`         - Estado: ${state}`);
            console.log(`         - URL: ${url}`);
            console.log(`         - Creado: ${createdAt}`);
          });
          console.log('');
        }
      } catch (deployError) {
        console.log(`   ⚠️  Error al listar deployments: ${deployError.data?.error?.message || deployError.error || 'Desconocido'}`);
        console.log('   ℹ️  Esto puede indicar que el token no tiene permisos para leer deployments\n');
      }
    } else {
      console.log('   ⚠️  Proyecto "erp-taller-saas" no encontrado\n');
      console.log('   💡 Proyectos disponibles:');
      projects.slice(0, 5).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name}`);
      });
      console.log('');
    }
    
    // 5. Verificar permisos de eliminación (intento leer un deployment específico si existe)
    console.log('5️⃣ Verificando permisos...');
    console.log('   ✅ Token tiene permisos de lectura');
    
    // Nota: No podemos probar eliminación sin riesgo, pero podemos verificar el scope del token
    console.log('   ⚠️  Permisos de eliminación: No se pueden verificar sin intentar eliminar');
    console.log('   💡 Si el token tiene scope completo, debería poder eliminar deployments\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESUMEN:');
    console.log('   Token válido: ✅');
    console.log('   Permisos de lectura: ✅');
    console.log('   Permisos de eliminación: ⚠️  (requiere prueba real)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Para limpiar deployments antiguos, usa:');
    console.log('   node scripts/vercel-cleanup-deployments.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.data?.error?.message || error.error || error);
    if (error.status === 401 || error.status === 403) {
      console.error('\n💡 El token puede estar expirado o no tener los permisos necesarios.');
      console.error('   Verifica que el token tenga scope "Full Account" en Vercel.\n');
    }
    process.exit(1);
  }
}

checkToken();

