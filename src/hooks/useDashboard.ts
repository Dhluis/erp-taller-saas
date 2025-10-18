'use client';

import { useState, useEffect } from 'react';
import { getDashboardStats, DashboardStats, DashboardCharts } from '@/lib/database/queries/dashboard';
import { DateRange } from '@/components/dashboard/DashboardFilters';

export function useDashboard(organizationId: string, dateRange: DateRange = '7d') {
  const [stats, setStats] = useState<(DashboardStats & { charts: DashboardCharts }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Función para refrescar manualmente
  const refresh = async () => {
    await fetchStats();
  };

  // Función para obtener fechas según el rango
  const getDateRangeParams = (range: DateRange): { startDate: Date; endDate: Date } => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '7d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    return { startDate, endDate: now };
  };

  async function fetchStats() {
    try {
      setLoading(true);
      setError(null);
      
      const dateRangeParams = getDateRangeParams(dateRange);
      console.log('📅 [useDashboard] Rango calculado:', dateRangeParams);
      
      const data = await getDashboardStats(organizationId, dateRangeParams);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      console.error('Error al cargar estadísticas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (organizationId) {
      fetchStats();
    }
  }, [organizationId, dateRange]);

  return { stats, loading, error, refresh };
}
