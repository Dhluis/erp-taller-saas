'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/context/SessionContext';

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
  const { organizationId } = useSession();

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    
    // Buscar desde el primer carácter (no esperar mínimo)
    if (!trimmedQuery || !organizationId) {
      if (!organizationId) {
        console.warn('⚠️ [GlobalSearch] No hay organizationId disponible');
      }
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
      const searchTerm = trimmedQuery.toLowerCase();
      const orgId = organizationId;

      console.log('🔍 [GlobalSearch] Buscando:', searchTerm, 'orgId:', orgId);

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
          .limit(10),

        // Clientes
        supabase
          .from('customers')
          .select('id, name, email, phone, address')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(10),

        // Vehículos - CORREGIDO: usar organization_id en lugar de workshop_id
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
          .eq('organization_id', orgId)
          .or(`brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(10),

        // Productos
        supabase
          .from('inventory_items')
          .select('id, name, sku, current_stock, min_stock, unit_price, category')
          .eq('organization_id', orgId)
          .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .order('name', { ascending: true })
          .limit(10),
      ]);

      const results = {
        orders: ordersRes.data || [],
        customers: customersRes.data || [],
        vehicles: vehiclesRes.data || [],
        products: productsRes.data || [],
      };

      // Log detallado para debug
      console.log('✅ [GlobalSearch] Resultados encontrados:', {
        query: searchTerm,
        orders: results.orders.length,
        customers: results.customers.length,
        vehicles: results.vehicles.length,
        products: results.products.length,
        total: results.orders.length + results.customers.length + results.vehicles.length + results.products.length,
      });

      // Log de errores si hay
      if (ordersRes.error) console.error('❌ Error en órdenes:', ordersRes.error);
      if (customersRes.error) console.error('❌ Error en clientes:', customersRes.error);
      if (vehiclesRes.error) console.error('❌ Error en vehículos:', vehiclesRes.error);
      if (productsRes.error) console.error('❌ Error en productos:', productsRes.error);

      setResults(results);
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
  }, [organizationId]);

  return {
    results,
    loading,
    search,
  };
}








