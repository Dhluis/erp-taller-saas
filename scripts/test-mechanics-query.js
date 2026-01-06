// Script de prueba para verificar query de mecánicos
// Ejecutar con: node scripts/test-mechanics-query.js

const { createClient } = require('@supabase/supabase-js')

// ✅ Usar variables de entorno en lugar de hardcodear credenciales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igshgleciwknpupbmvhn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxMTYwODksImV4cCI6MjA0NzY5MjA4OX0.xMjxQQhN9yGYJ9WHtlrzMnjLaJYPkuHkh6hDZ8lqDSE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testMechanicsQuery() {
  console.log('🔍 [Test] Ejecutando query de mecánicos...\n')
  
  const organizationId = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, workshop_id, organization_id, is_active')
    .eq('organization_id', organizationId)
    .eq('role', 'MECANICO')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  console.log('📊 Resultado query mecánicos:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Data:', data)
  console.log('❌ Error:', error)
  console.log('📈 Count:', data?.length || 0)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (error) {
    console.error('❌ Error en la query:', error.message)
    console.error('   Code:', error.code)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
    return
  }

  if (data && data.length > 0) {
    console.log('✅ Mecánicos encontrados:', data.length)
    console.log('\n👤 Primeros 3 mecánicos:')
    data.slice(0, 3).forEach((mech, index) => {
      console.log(`\n   ${index + 1}. ${mech.full_name || mech.email || 'Sin nombre'}`)
      console.log(`      ID: ${mech.id}`)
      console.log(`      Email: ${mech.email || 'N/A'}`)
      console.log(`      Role: ${mech.role}`)
      console.log(`      Workshop ID: ${mech.workshop_id || 'N/A'}`)
      console.log(`      Organization ID: ${mech.organization_id}`)
      console.log(`      Is Active: ${mech.is_active}`)
    })
  } else {
    console.log('⚠️ No se encontraron mecánicos con los criterios especificados')
    console.log('\n🔍 Verificando usuarios con role MECANICO (sin filtro is_active):')
    
    const { data: allMechanics, error: allError } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, organization_id')
      .eq('organization_id', organizationId)
      .eq('role', 'MECANICO')
    
    if (!allError && allMechanics) {
      console.log(`   Total encontrados: ${allMechanics.length}`)
      if (allMechanics.length > 0) {
        console.log('   Estados is_active:')
        const activeCount = allMechanics.filter(m => m.is_active).length
        const inactiveCount = allMechanics.filter(m => !m.is_active).length
        console.log(`   - Activos: ${activeCount}`)
        console.log(`   - Inactivos: ${inactiveCount}`)
      }
    }
  }
}

testMechanicsQuery()
  .then(() => {
    console.log('\n✅ Test completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando test:', error)
    process.exit(1)
  })

