// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * GET /api/leads
 * Obtener leads con filtros
 * 
 * Query params:
 * - status: 'new' | 'contacted' | 'qualified' | 'appointment' | 'converted' | 'lost'
 * - assigned_to: UUID del usuario asignado
 * - lead_source: 'whatsapp' | 'web' | 'phone' | etc
 * - page: número de página (default: 1)
 * - pageSize: tamaño de página (default: 20)
 * - sortBy: campo para ordenar (default: 'created_at')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 * - search: buscar por nombre, teléfono o email
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id

    // Obtener query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assigned_to')
    const leadSource = searchParams.get('lead_source')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search')

    // Construir query
    let query = supabase
      .from('leads')
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email),
        customer:customers(id, name),
        whatsapp_conversation:whatsapp_conversations(id, contact_name, customer_phone)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (leadSource) {
      query = query.eq('lead_source', leadSource)
    }

    // Búsqueda
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Paginación
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query.range(from, to)

    // Ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Ejecutar query
    const { data: leads, error: leadsError, count } = await query

    if (leadsError) {
      console.error('[Leads API] Error obteniendo leads:', leadsError)
      return NextResponse.json(
        { error: 'Error obteniendo leads', details: leadsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leads
 * Crear lead manualmente (no desde conversación)
 * 
 * Body:
 * - name: string (required)
 * - phone: string (required)
 * - email?: string
 * - company?: string
 * - estimated_value?: number
 * - lead_source?: string
 * - assigned_to?: UUID
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener organization_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id

    // Obtener body
    const body = await request.json()
    const {
      name,
      phone,
      email,
      company,
      estimated_value,
      lead_source = 'manual',
      assigned_to,
      notes
    } = body

    // Validaciones
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nombre y teléfono son requeridos' },
        { status: 400 }
      )
    }

    // Crear lead
    const { data: lead, error: createError } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name,
        phone,
        email,
        company,
        estimated_value: estimated_value || 0,
        lead_source,
        assigned_to,
        notes,
        status: 'new'
      })
      .select(`
        *,
        assigned_user:users!leads_assigned_to_fkey(id, full_name, email)
      `)
      .single()

    if (createError) {
      console.error('[Leads API] Error creando lead:', createError)
      
      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un lead con este teléfono en tu organización' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Error creando lead', details: createError.message },
        { status: 500 }
      )
    }

    console.log('[Leads API] Lead creado exitosamente:', lead.id)

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead creado exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}

