/**
 * Script para limpiar deployments antiguos de Vercel
 * 
 * Configuración:
 *   - KEEP_LAST: Mantener los últimos N deployments (default: 5)
 *   - DELETE_OLDER_THAN_DAYS: Eliminar deployments más antiguos que X días (default: 30)
 *   - DELETE_STATES: Estados a eliminar (default: ['READY', 'ERROR', 'CANCELED'])
 * 
 * Uso:
 *   VERCEL_TOKEN=tu_token node scripts/vercel-cleanup-deployments.js
 *   VERCEL_TOKEN=tu_token KEEP_LAST=10 DELETE_OLDER_THAN_DAYS=7 node scripts/vercel-cleanup-deployments.js
 */

const https = require('https');
const readline = require('readline');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_NAME = process.env.PROJECT_NAME || 'erp-taller-saas';
const KEEP_LAST = parseInt(process.env.KEEP_LAST || '5', 10);
const DELETE_OLDER_THAN_DAYS = parseInt(process.env.DELETE_OLDER_THAN_DAYS || '30', 10);
const DELETE_STATES = (process.env.DELETE_STATES || 'READY,ERROR,CANCELED').split(',').map(s => s.trim());
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Por defecto, dry-run (no elimina realmente)

if (!VERCEL_TOKEN) {
  console.error('❌ Error: VERCEL_TOKEN no está configurado');
  console.log('\nUso:');
  console.log('  VERCEL_TOKEN=tu_token node scripts/vercel-cleanup-deployments.js');
  console.log('\nOpciones:');
  console.log('  PROJECT_NAME=nombre-proyecto (default: erp-taller-saas)');
  console.log('  KEEP_LAST=5 (mantener últimos N)');
  console.log('  DELETE_OLDER_THAN_DAYS=30 (eliminar más antiguos que X días)');
  console.log('  DELETE_STATES=READY,ERROR,CANCELED (estados a eliminar)');
  console.log('  DRY_RUN=false (para eliminar realmente, por defecto es true)');
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
          const json = data ? JSON.parse(data) : {};
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

// Función para obtener proyecto por nombre
async function getProjectByName(projectName) {
  try {
    const response = await vercelRequest('/v9/projects');
    const projects = response.data.projects || [];
    return projects.find(p => p.name === projectName);
  } catch (error) {
    throw new Error(`Error al buscar proyecto: ${error.data?.error?.message || error.error}`);
  }
}

// Función para listar todos los deployments de un proyecto
async function getAllDeployments(projectId, limit = 100) {
  const deployments = [];
  let until = null;
  
  try {
    while (true) {
      let url = `/v6/deployments?projectId=${projectId}&limit=${limit}`;
      if (until) {
        url += `&until=${until}`;
      }
      
      const response = await vercelRequest(url);
      const batch = response.data.deployments || [];
      
      if (batch.length === 0) break;
      
      deployments.push(...batch);
      until = batch[batch.length - 1].createdAt;
      
      // Si obtenemos menos que el límite, es la última página
      if (batch.length < limit) break;
      
      // Limitar a 1000 deployments máximo para evitar loops infinitos
      if (deployments.length >= 1000) break;
    }
    
    return deployments;
  } catch (error) {
    throw new Error(`Error al listar deployments: ${error.data?.error?.message || error.error}`);
  }
}

// Función para eliminar un deployment
async function deleteDeployment(deploymentId) {
  try {
    await vercelRequest(`/v13/deployments/${deploymentId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    if (error.status === 404) {
      console.log(`      ⚠️  Deployment ya eliminado (404)`);
      return true;
    }
    throw new Error(error.data?.error?.message || error.error || 'Error desconocido');
  }
}

// Función para confirmar acción
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Función principal
async function cleanupDeployments() {
  console.log('🧹 Limpieza de deployments de Vercel\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  Configuración:');
  console.log(`   Proyecto: ${PROJECT_NAME}`);
  console.log(`   Mantener últimos: ${KEEP_LAST}`);
  console.log(`   Eliminar más antiguos que: ${DELETE_OLDER_THAN_DAYS} días`);
  console.log(`   Estados a eliminar: ${DELETE_STATES.join(', ')}`);
  console.log(`   Modo: ${DRY_RUN ? '🔍 DRY RUN (no eliminará realmente)' : '⚠️  MODO REAL (eliminará deployments)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. Buscar proyecto
    console.log('1️⃣ Buscando proyecto...');
    const project = await getProjectByName(PROJECT_NAME);
    
    if (!project) {
      console.error(`❌ Proyecto "${PROJECT_NAME}" no encontrado`);
      process.exit(1);
    }
    
    console.log(`   ✅ Proyecto encontrado: ${project.name} (${project.id})\n`);
    
    // 2. Listar todos los deployments
    console.log('2️⃣ Obteniendo deployments...');
    const allDeployments = await getAllDeployments(project.id);
    console.log(`   ✅ Total de deployments: ${allDeployments.length}\n`);
    
    if (allDeployments.length === 0) {
      console.log('   ℹ️  No hay deployments para procesar\n');
      return;
    }
    
    // 3. Ordenar por fecha (más recientes primero)
    allDeployments.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    // 4. Filtrar deployments a eliminar
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (DELETE_OLDER_THAN_DAYS * 24 * 60 * 60 * 1000));
    
    const toDelete = [];
    const toKeep = [];
    
    allDeployments.forEach((deploy, index) => {
      const createdAt = new Date(deploy.createdAt);
      const state = deploy.readyState || deploy.state || 'UNKNOWN';
      const isOld = createdAt < cutoffDate;
      const isDeletableState = DELETE_STATES.includes(state);
      const isNotInKeepLast = index >= KEEP_LAST;
      
      if (isNotInKeepLast && isDeletableState && isOld) {
        toDelete.push({ deploy, reason: `Antiguo (${Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))} días) y estado ${state}` });
      } else if (isNotInKeepLast && isDeletableState) {
        toDelete.push({ deploy, reason: `Fuera de los últimos ${KEEP_LAST} y estado ${state}` });
      } else {
        toKeep.push({ deploy, reason: index < KEEP_LAST ? 'Últimos N' : `Estado ${state} no eliminable` });
      }
    });
    
    // 5. Mostrar resumen
    console.log('3️⃣ Análisis de deployments:\n');
    console.log(`   📊 Total: ${allDeployments.length}`);
    console.log(`   ✅ Mantener: ${toKeep.length}`);
    console.log(`   🗑️  Eliminar: ${toDelete.length}\n`);
    
    if (toDelete.length === 0) {
      console.log('   ℹ️  No hay deployments para eliminar según los criterios configurados\n');
      return;
    }
    
    // 6. Mostrar deployments a eliminar
    console.log('4️⃣ Deployments a eliminar:\n');
    toDelete.slice(0, 20).forEach(({ deploy, reason }, index) => {
      const createdAt = new Date(deploy.createdAt).toLocaleString();
      const state = deploy.readyState || deploy.state || 'UNKNOWN';
      const url = deploy.url || 'N/A';
      console.log(`   ${index + 1}. ${deploy.id.substring(0, 16)}...`);
      console.log(`      - Estado: ${state}`);
      console.log(`      - URL: ${url}`);
      console.log(`      - Creado: ${createdAt}`);
      console.log(`      - Razón: ${reason}`);
    });
    
    if (toDelete.length > 20) {
      console.log(`   ... y ${toDelete.length - 20} más\n`);
    } else {
      console.log('');
    }
    
    // 7. Confirmar si no es dry-run
    if (!DRY_RUN) {
      console.log('⚠️  ATENCIÓN: Esta acción ELIMINARÁ permanentemente los deployments listados.\n');
      const answer = await askQuestion('¿Continuar? (yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Operación cancelada\n');
        return;
      }
      console.log('');
    }
    
    // 8. Eliminar deployments
    console.log(`5️⃣ ${DRY_RUN ? 'Simulando eliminación' : 'Eliminando deployments'}...\n`);
    
    let deleted = 0;
    let errors = 0;
    
    for (const { deploy } of toDelete) {
      try {
        if (DRY_RUN) {
          console.log(`   🔍 [DRY RUN] Eliminaría: ${deploy.id.substring(0, 16)}... (${deploy.url || 'N/A'})`);
          deleted++;
        } else {
          await deleteDeployment(deploy.id);
          console.log(`   ✅ Eliminado: ${deploy.id.substring(0, 16)}... (${deploy.url || 'N/A'})`);
          deleted++;
          
          // Pequeña pausa para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.log(`   ❌ Error eliminando ${deploy.id.substring(0, 16)}...: ${error.message}`);
        errors++;
      }
    }
    
    // 9. Resumen final
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESUMEN:');
    console.log(`   Total procesados: ${toDelete.length}`);
    console.log(`   ${DRY_RUN ? 'Simulados' : 'Eliminados'}: ${deleted}`);
    if (errors > 0) {
      console.log(`   Errores: ${errors}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (DRY_RUN) {
      console.log('💡 Para eliminar realmente, ejecuta con:');
      console.log('   DRY_RUN=false VERCEL_TOKEN=tu_token node scripts/vercel-cleanup-deployments.js\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    if (error.status === 401 || error.status === 403) {
      console.error('\n💡 El token puede estar expirado o no tener los permisos necesarios.');
      console.error('   Verifica que el token tenga scope "Full Account" en Vercel.\n');
    }
    process.exit(1);
  }
}

cleanupDeployments();

