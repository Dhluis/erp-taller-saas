'use client';

import { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export type DateRange = '7d' | '30d' | 'month' | 'custom';

interface DashboardFiltersProps {
  onFilterChange: (range: DateRange) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  currentRange: DateRange;
}

export function DashboardFilters({ 
  onFilterChange, 
  onRefresh, 
  isLoading = false,
  currentRange 
}: DashboardFiltersProps) {
  const filterOptions = [
    { value: '7d' as DateRange, label: 'Últimos 7 días' },
    { value: '30d' as DateRange, label: 'Últimos 30 días' },
    { value: 'month' as DateRange, label: 'Mes actual' },
    { value: 'custom' as DateRange, label: 'Personalizado' }
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/50 border border-gray-700/50 rounded-xl p-4">
      {/* Selector de rango */}
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-gray-400" />
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              disabled={isLoading}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${currentRange === option.value
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botón de refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-slate-700/50 hover:bg-slate-700 
          text-gray-300 hover:text-white
          border border-gray-600/50 hover:border-gray-500
          transition-all font-medium text-sm
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        <span>{isLoading ? 'Actualizando...' : 'Actualizar'}</span>
      </button>
    </div>
  );
}
