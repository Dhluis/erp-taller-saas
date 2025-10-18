'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface VehiclesFiltersProps {
  onSearch: (search: string) => void;
  onFilter: (filters: any) => void;
}

export function VehiclesFilters({ onSearch, onFilter }: VehiclesFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo, placa o VIN..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border rounded-lg
                     text-text-primary placeholder-text-muted
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            px-4 py-3 rounded-lg border transition-all
            flex items-center space-x-2
            ${showFilters
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-bg-tertiary border-border text-text-secondary hover:border-primary hover:text-primary'
            }
          `}
        >
          <FunnelIcon className="w-5 h-5" />
          <span className="font-medium">Filtros</span>
        </button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-bg-secondary rounded-lg border border-border p-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Make
              </label>
              <select className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Todas las marcas</option>
                <option value="Toyota">Toyota</option>
                <option value="Honda">Honda</option>
                <option value="Nissan">Nissan</option>
                <option value="Ford">Ford</option>
                <option value="Chevrolet">Chevrolet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Año
              </label>
              <select className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Todos los años</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Cliente
              </label>
              <select className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Todos los clientes</option>
                <option value="customer-1">Juan Pérez</option>
                <option value="customer-2">María García</option>
                <option value="customer-3">Carlos López</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  onSearch('');
                  onFilter({});
                }}
                className="w-full px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

