'use client';

import { useState, useCallback } from 'react';

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

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    
    // Buscar desde el primer carácter (no esperar mínimo)
    if (!trimmedQuery) {
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
      console.log('🔍 [GlobalSearch] Buscando:', trimmedQuery);

      // ✅ Usar API route en lugar de queries directas desde el cliente
      const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmedQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('❌ Error en búsqueda global:', response.statusText);
        setResults({
          orders: [],
          customers: [],
          vehicles: [],
          products: [],
        });
        return;
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        setResults({
          orders: [],
          customers: [],
          vehicles: [],
          products: [],
        });
        return;
      }

      // Agrupar resultados por tipo
      const groupedResults: SearchResults = {
        orders: [],
        customers: [],
        vehicles: [],
        products: [],
      };

      result.data.forEach((item: any) => {
        switch (item.type) {
          case 'order':
            groupedResults.orders.push(item);
            break;
          case 'customer':
            groupedResults.customers.push(item);
            break;
          case 'vehicle':
            groupedResults.vehicles.push(item);
            break;
          case 'product':
            groupedResults.products.push(item);
            break;
        }
      });

      // Log detallado para debug
      console.log('✅ [GlobalSearch] Resultados encontrados:', {
        query: trimmedQuery,
        orders: groupedResults.orders.length,
        customers: groupedResults.customers.length,
        vehicles: groupedResults.vehicles.length,
        products: groupedResults.products.length,
        total: groupedResults.orders.length + groupedResults.customers.length + groupedResults.vehicles.length + groupedResults.products.length,
      });

      setResults(groupedResults);
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
  }, []);

  return {
    results,
    loading,
    search,
  };
}








