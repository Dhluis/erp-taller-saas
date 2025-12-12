import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/employees - Iniciando...')
    
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener todos los empleados activos de la organización
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo empleados:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    return NextResponse.json(employees || [])

  } catch (error: any) {
    console.error('💥 Error en GET /api/employees:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}