import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { hasPermission, UserRole } from '@/lib/auth/permissions'
import type { CreateEmployeeRequest } from '@/types/employee'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/employees - Iniciando...')
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/employees] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/employees] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: []
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;
    
    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const role = searchParams.get('role')
    
    // Construir query usando Service Role Client
    let query = supabaseAdmin
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    // Filtrar por activos
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    // Filtrar por rol
    if (role) {
      query = query.eq('role', role)
    }

    const { data: employees, error } = await query

    if (error) {
      console.error('❌ Error obteniendo empleados:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: []
        },
        { status: 500 }
      )
    }

    console.log('✅ Empleados obtenidos:', employees?.length || 0)
    return NextResponse.json({
      success: true,
      employees: employees || [], // ✅ Mantener compatibilidad con código que espera 'employees'
      data: employees || [] // ✅ También incluir 'data' para consistencia
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/employees:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/employees - Iniciando...')

    const supabaseAuth = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()

    // 2. Obtener rol y organización del usuario actual
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !currentUser || !currentUser.organization_id) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = currentUser.organization_id
    
    // 3. Validar permisos (solo admin puede crear empleados)
    const currentUserRole = currentUser.role as UserRole
    if (!hasPermission(currentUserRole, 'employees', 'create')) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear empleados' },
        { status: 403 }
      )
    }
    
    // 4. Obtener datos del body
    const body: CreateEmployeeRequest = await request.json()
    const { 
      name, 
      email, 
      phone, 
      role = 'mechanic', // Por defecto mecánico
      specialties = [],
      hourly_rate,
      hire_date,
    } = body
    
    // 5. Validaciones
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }
    
    // Validar email si se proporciona
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Email inválido' },
          { status: 400 }
        )
      }
      
      // Verificar que el email no exista en empleados
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .maybeSingle()
      
      if (existingEmployee) {
        return NextResponse.json(
          { error: 'Ya existe un empleado con este email' },
          { status: 409 }
        )
      }
    }
    
    // Validar rol
    const validRoles = ['mechanic', 'receptionist', 'supervisor', 'manager']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 6. Crear empleado
    const { data: newEmployee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role,
        specialties: Array.isArray(specialties) ? specialties : [],
        hourly_rate: hourly_rate || null,
        hire_date: hire_date || new Date().toISOString().split('T')[0],
        is_active: true,
      })
      .select()
      .single()
    
    if (employeeError) {
      console.error('❌ Error creando empleado:', employeeError)
      return NextResponse.json(
        { error: `Error al crear empleado: ${employeeError.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ Empleado creado exitosamente:', newEmployee.id)
    
    // 7. Retornar empleado creado
    return NextResponse.json({
      employee: newEmployee,
      message: 'Empleado creado exitosamente'
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('💥 Error en POST /api/employees:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}