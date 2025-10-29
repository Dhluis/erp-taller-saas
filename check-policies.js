const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase local
const supabaseUrl = 'http://localhost:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPolicies() {
  try {
    console.log('🔍 Verificando políticas RLS...\n')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies
        WHERE tablename IN ('customers', 'vehicles', 'work_orders', 'employees', 'users')
        ORDER BY tablename, policyname;
      `
    })

    if (error) {
      console.error('❌ Error ejecutando consulta:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No se encontraron políticas RLS')
      return
    }

    console.log('📊 POLÍTICAS RLS ACTIVAS:\n')
    console.log('┌─────────────┬─────────────┬─────────────────────┬───────────┬─────────┬─────┐')
    console.log('│ Tabla       │ Política    │ Roles               │ Permisivo │ Comando │     │')
    console.log('├─────────────┼─────────────┼─────────────────────┼───────────┼─────────┼─────┤')

    data.forEach(policy => {
      const table = policy.tablename.padEnd(11)
      const policyName = policy.policyname.padEnd(11)
      const roles = (policy.roles || []).join(', ').padEnd(19)
      const permissive = policy.permissive ? 'Sí' : 'No'
      const cmd = policy.cmd.padEnd(7)
      
      console.log(`│ ${table} │ ${policyName} │ ${roles} │ ${permissive.padEnd(9)} │ ${cmd} │     │`)
    })

    console.log('└─────────────┴─────────────┴─────────────────────┴───────────┴─────────┴─────┘')
    
    // Resumen por tabla
    const summary = {}
    data.forEach(policy => {
      if (!summary[policy.tablename]) {
        summary[policy.tablename] = { total: 0, commands: new Set() }
      }
      summary[policy.tablename].total++
      summary[policy.tablename].commands.add(policy.cmd)
    })

    console.log('\n📈 RESUMEN POR TABLA:')
    Object.entries(summary).forEach(([table, info]) => {
      console.log(`  ${table}: ${info.total} políticas (${Array.from(info.commands).join(', ')})`)
    })

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

checkPolicies()
