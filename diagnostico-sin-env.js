// Script de diagnóstico que funciona sin variables de entorno
// Ejecutar con: node diagnostico-sin-env.js

const { createClient } = require('@supabase/supabase-js')

console.log('🔍 DIAGNÓSTICO SIN VARIABLES DE ENTORNO')
console.log('========================================\n')

console.log('📋 Para ejecutar este diagnóstico necesitas:')
console.log('1. Ir a tu proyecto de Supabase Dashboard')
console.log('2. Ve a Settings → API')
console.log('3. Copia tu Project URL y anon public key')
console.log('4. Reemplaza los valores en este script\n')

// INSTRUCCIONES PARA EL USUARIO
console.log('🚨 INSTRUCCIONES:')
console.log('================')
console.log('1. Ve a https://supabase.com/dashboard')
console.log('2. Selecciona tu proyecto')
console.log('3. Ve a Settings → API')
console.log('4. Copia estos valores:')
console.log('   - Project URL (algo como: https://xxxxx.supabase.co)')
console.log('   - anon public key (una clave larga)')
console.log('5. Reemplaza los valores en las líneas 25-26 de este script')
console.log('6. Ejecuta: node diagnostico-sin-env.js\n')

// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO
const supabaseUrl = 'https://tu-proyecto.supabase.co'  // ← REEMPLAZA ESTO
const supabaseKey = 'tu-clave-anonima-aqui'           // ← REEMPLAZA ESTO

console.log('📋 Configuración actual:')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey.substring(0, 20)}...`)

if (supabaseUrl === 'https://tu-proyecto.supabase.co' || supabaseKey === 'tu-clave-anonima-aqui') {
  console.log('\n❌ ERROR: Necesitas configurar los valores de Supabase')
  console.log('📝 Edita este script y reemplaza los valores en las líneas 25-26')
  console.log('💡 O ejecuta directamente la solución SQL en Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticarSistema() {
  console.log('\n🧪 Iniciando diagnóstico...\n')

  // Lista de tablas críticas para verificar
  const tablasCriticas = [
    'inventory_movements',
    'purchase_orders', 
    'payments',
    'suppliers',
    'leads',
    'campaigns',
    'appointments',
    'invoices',
    'notifications'
  ]

  const resultados = []

  for (const tabla of tablasCriticas) {
    try {
      console.log(`🔍 Verificando tabla: ${tabla}`)
      
      // Intentar hacer una consulta simple
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ ${tabla}: ERROR - ${error.message}`)
        resultados.push({
          tabla,
          estado: 'ERROR',
          error: error.message,
          codigo: error.code,
          detalles: error.details,
          hint: error.hint
        })
      } else {
        console.log(`✅ ${tabla}: OK (${data?.length || 0} registros)`)
        resultados.push({
          tabla,
          estado: 'OK',
          registros: data?.length || 0
        })
      }
    } catch (err) {
      console.log(`❌ ${tabla}: EXCEPCIÓN - ${err.message}`)
      resultados.push({
        tabla,
        estado: 'EXCEPCIÓN',
        error: err.message
      })
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DEL DIAGNÓSTICO')
  console.log('='.repeat(60))

  const errores = resultados.filter(r => r.estado !== 'OK')
  const exitosos = resultados.filter(r => r.estado === 'OK')

  console.log(`✅ Tablas funcionando: ${exitosos.length}`)
  console.log(`❌ Tablas con problemas: ${errores.length}`)

  if (errores.length > 0) {
    console.log('\n❌ PROBLEMAS DETECTADOS:')
    errores.forEach(error => {
      console.log(`   - ${error.tabla}: ${error.error || error.estado}`)
    })
    
    console.log('\n💡 SOLUCIÓN:')
    console.log('   1. Ve al SQL Editor de Supabase')
    console.log('   2. Ejecuta el script de FIX_INMEDIATO.sql')
    console.log('   3. O ejecuta el script de SOLUCION_DIRECTA.md')
    console.log('   4. Refresca tu aplicación web')
  } else {
    console.log('\n🎉 ¡TODAS LAS TABLAS FUNCIONAN CORRECTAMENTE!')
    console.log('   El problema puede estar en otro lado.')
  }

  console.log('\n' + '='.repeat(60))
}

diagnosticarSistema()
  .then(() => {
    console.log('\n🏁 Diagnóstico completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en el diagnóstico:', error)
    process.exit(1)
  })



