import { useMemo, useCallback } from 'react';

/**
 * Hook para optimizar cálculos pesados en componentes
 * Evita recálculos innecesarios usando useMemo
 */
export function useOptimizedCalculations<T, R>(
  data: T[],
  calculationFn: (item: T) => R
) {
  return useMemo(() => {
    return data.map(calculationFn);
  }, [data, calculationFn]);
}

/**
 * Hook para optimizar funciones que se pasan como props
 * Evita re-renders innecesarios usando useCallback
 */
export function useOptimizedCallbacks<T extends (...args: unknown[]) => unknown>(
  callbacks: T[]
) {
  return callbacks.map(callback => useCallback(callback, []));
}

/**
 * Hook para cálculos de estadísticas pesadas
 */
export function useStatistics(data: Record<string, unknown>[]) {
  return useMemo(() => {
    if (!data.length) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        sum: 0
      };
    }

    const numericValues = data
      .map(item => typeof item === 'number' ? item : 0)
      .filter(value => !isNaN(value));

    if (!numericValues.length) {
      return {
        total: data.length,
        average: 0,
        min: 0,
        max: 0,
        sum: 0
      };
    }

    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const average = sum / numericValues.length;
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    return {
      total: data.length,
      average: Math.round(average * 100) / 100,
      min,
      max,
      sum
    };
  }, [data]);
}

/**
 * Hook para filtros optimizados
 */
export function useOptimizedFilters<T>(
  data: T[],
  filters: {
    search?: string;
    category?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
  }
) {
  return useMemo(() => {
    let filteredData = [...data];

    // Filtro de búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredData = filteredData.filter(item => {
        // Buscar en propiedades comunes
        const searchableProps = ['name', 'title', 'description', 'email', 'phone'];
        return searchableProps.some(prop => {
          const value = (item as Record<string, unknown>)[prop];
          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      });
    }

    // Filtro de categoría
    if (filters.category) {
      filteredData = filteredData.filter(item => 
        (item as Record<string, unknown>).category_id === filters.category
      );
    }

    // Filtro de estado
    if (filters.status) {
      filteredData = filteredData.filter(item => 
        (item as Record<string, unknown>).status === filters.status
      );
    }

    // Filtro de rango de fechas
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filteredData = filteredData.filter(item => {
        const date = new Date((item as Record<string, unknown>).created_at as string || (item as Record<string, unknown>).date as string);
        return date >= start && date <= end;
      });
    }

    return filteredData;
  }, [data, filters]);
}

/**
 * Hook para paginación optimizada
 */
export function useOptimizedPagination<T>(
  data: T[],
  page: number,
  pageSize: number
) {
  return useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(data.length / pageSize);

    return {
      data: paginatedData,
      totalItems: data.length,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, data.length)
    };
  }, [data, page, pageSize]);
}

/**
 * Hook para ordenamiento optimizado
 */
export function useOptimizedSorting<T>(
  data: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  return useMemo(() => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortBy];
      const bValue = (b as Record<string, unknown>)[sortBy];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [data, sortBy, sortOrder]);
}

/**
 * Hook para debounce optimizado
 */
export function useOptimizedDebounce<T>(
  value: T,
  delay: number
) {
  return useMemo(() => {
    const timeoutId = setTimeout(() => value, delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);
}

/**
 * Hook para memoización de objetos complejos
 */
export function useOptimizedObject<T extends Record<string, any>>(
  obj: T
) {
  return useMemo(() => obj, [JSON.stringify(obj)]);
}

/**
 * Hook para cálculos de fechas optimizados
 */
export function useOptimizedDates(dates: (string | Date)[]) {
  return useMemo(() => {
    return dates.map(date => {
      const dateObj = new Date(date);
      return {
        original: date,
        formatted: dateObj.toLocaleDateString(),
        relative: getRelativeTime(dateObj),
        isValid: !isNaN(dateObj.getTime())
      };
    });
  }, [dates]);
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Hace un momento';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  if (diffInSeconds < 31536000) return `Hace ${Math.floor(diffInSeconds / 2592000)} meses`;
  return `Hace ${Math.floor(diffInSeconds / 31536000)} años`;
}

