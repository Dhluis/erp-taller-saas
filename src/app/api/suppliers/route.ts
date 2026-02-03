/**
 * API Route: Suppliers
 * GET /api/suppliers - Listar proveedores
 * POST /api/suppliers - Crear proveedor
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema de validación
// Aceptar tanto contact_person como contact_name para compatibilidad con formularios
const supplierSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  contact_name: z.string().optional(),
  contact_person: z.string().optional(), // Compatibilidad con formularios
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  zip_code: z.string().optional(), // Compatibilidad con formularios
  country: z.string().optional(),
  tax_id: z.string().optional(),
  company_name: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true)
}).transform((data) => {
  // Normalizar: usar contact_name y postal_code como estándar
  const normalized: any = {
    ...data,
    contact_name: data.contact_name || data.contact_person || undefined,
    postal_code: data.postal_code || data.zip_code || undefined,
  }
  
  // Remover campos alternativos
  delete normalized.contact_person
  delete normalized.zip_code
  
  // Remover undefined
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined) {
      delete normalized[key]
    }
  })
  
  return normalized
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'No se pudo obtener organización' }, { status: 403 })
    }
    
    // Parámetros de query
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    
    // ✅ Bug Fix 2: Leer sortBy y sortOrder de query params
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Validar campos de ordenamiento permitidos
    const validSortFields = ['name', 'created_at', 'updated_at', 'email', 'company_name']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'
    
    // Construir query
    let query = supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('organization_id', userProfile.organization_id)
      .order(sortField, { ascending })
    
    // Filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }
    
    // Paginación
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
    
    const { data: suppliers, error, count } = await query
    
    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // ✅ Bug Fix 3: Retornar 'items' en lugar de 'suppliers' para compatibilidad con hook
    return NextResponse.json({
      success: true,
      data: {
        items: suppliers || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          hasNextPage: page * pageSize < (count || 0),
          hasPreviousPage: page > 1
        }
      }
    })
    
  } catch (error) {
    console.error('Error in GET /api/suppliers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    // Obtener organization_id
    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'No se pudo obtener organización' }, { status: 403 })
    }
    
    // Validar body
    const body = await request.json()
    const validatedData = supplierSchema.parse(body)
    
    // Crear proveedor - SOLO con campos del schema
    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        organization_id: userProfile.organization_id,
        name: validatedData.name,
        contact_name: validatedData.contact_name,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        postal_code: validatedData.postal_code,
        country: validatedData.country,
        tax_id: validatedData.tax_id,
        company_name: validatedData.company_name,
        notes: validatedData.notes,
        is_active: validatedData.is_active
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: supplier
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error in POST /api/suppliers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
