'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResults {
  orders: any[];
  customers: any[];
  vehicles: any[];
  products: any[];
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResults>({
    orders: [],
    customers: [],
    vehicles: [],
    products: [],
  });
  const [loading, setLoading] = useState(false);
  const { organization } = useAuth();

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !organization?.organization_id) {
      setResults({
        orders: [],
        customers: [],
        vehicles: [],
        products: [],
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const searchTerm = query.toLowerCase().trim();
      const orgId = organization.organization_id;

      // Búsqueda en paralelo de todas las entidades
      const [ordersRes, customersRes, vehiclesRes, productsRes] = await Promise.all([
        // Órdenes de trabajo
        supabase
          .from('work_orders')
          .select(`
            id,
            status,
            description,
            entry_date,
            estimated_cost,
            total_amount,
            customer:customers(id, name, phone, email),
            vehicle:vehicles(id, brand, model, year, license_plate)
          `)
          .eq('organization_id', orgId)
          .or(`id.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(5),

        // Clientes
        supabase
          .from('customers')
          .select('id, name, email, phone, address')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(5),

        // Vehículos
        supabase
          .from('vehicles')
          .select(`
            id,
            brand,
            model,
            year,
            license_plate,
            color,
            customer:customers(id, name)
          `)
          .eq('workshop_id', organization.id)
          .or(`brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(5),

        // Productos
        supabase
          .from('inventory_items')
          .select('id, name, sku, current_stock, min_stock, unit_price, category')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .order('name', { ascending: true })
          .limit(5),
      ]);

      setResults({
        orders: ordersRes.data || [],
        customers: customersRes.data || [],
        vehicles: vehiclesRes.data || [],
        products: productsRes.data || [],
      });

      // Log para debug (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Global Search Results:', {
          query: searchTerm,
          orders: ordersRes.data?.length || 0,
          customers: customersRes.data?.length || 0,
          vehicles: vehiclesRes.data?.length || 0,
          products: productsRes.data?.length || 0,
        });
      }
    } catch (error) {
      console.error('❌ Error en búsqueda global:', error);
      setResults({
        orders: [],
        customers: [],
        vehicles: [],
        products: [],
      });
    } finally {
      setLoading(false);
    }
  }, [organization]);

  return {
    results,
    loading,
    search,
  };
}


