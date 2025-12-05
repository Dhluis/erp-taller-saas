import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth/organization-server';
import { createServerClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'order' | 'invoice' | 'supplier';
  title: string;
  description: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * GET /api/search/suggestions - Obtener sugerencias rápidas filtradas por organización
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organization_id del usuario autenticado
    let organizationId: string;
    try {
      organizationId = await getOrganizationId(request);
    } catch (error: any) {
      console.error('[GET /api/search/suggestions] Error obteniendo organizationId:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario. Por favor, contacta al administrador.',
          data: []
        },
        { status: 403 }
      );
    }

    if (!organizationId) {
      console.error('[GET /api/search/suggestions] organizationId es null o undefined');
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario sin organización asignada. Por favor, contacta al administrador.',
          data: []
        },
        { status: 403 }
      );
    }

    const supabase = await createServerClient();

    const suggestions: SearchResult[] = [];

    // ✅ Obtener clientes recientes (FILTRADO POR ORGANIZACIÓN)
    const { data: recentCustomers } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .order('created_at', { ascending: false })
      .limit(3);

    recentCustomers?.forEach(customer => {
      suggestions.push({
        id: customer.id,
        type: 'customer',
        title: customer.name,
        description: customer.email || 'Cliente',
        url: `/clientes/${customer.id}`
      });
    });

    // ✅ Obtener productos populares (FILTRADO POR ORGANIZACIÓN)
    const { data: popularProducts } = await supabase
      .from('products')
      .select('id, name, code')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .eq('is_active', true)
      .limit(3);

    popularProducts?.forEach(product => {
      suggestions.push({
        id: product.id,
        type: 'product',
        title: product.name,
        description: product.code || 'Producto',
        url: `/inventario/productos/${product.id}`
      });
    });

    return NextResponse.json({
      success: true,
      data: suggestions
    });
  } catch (error: any) {
    console.error('Error obteniendo sugerencias:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener sugerencias',
        data: []
      },
      { status: 500 }
    );
  }
}

