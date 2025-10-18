'use client';

import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkOrderFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;
}

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'diagnosed', label: 'Diagnosticada' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'in_repair', label: 'En Reparación' },
  { value: 'waiting_parts', label: 'Esperando Piezas' },
  { value: 'completed', label: 'Completada' },
  { value: 'delivered', label: 'Entregada' },
];

export function WorkOrderFilters({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onSearch,
  onClearFilters,
}: WorkOrderFiltersProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-2">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, vehículo, descripción..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-9"
          />
        </div>

        {/* Filtro por estado */}
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botón buscar */}
        <Button onClick={onSearch} variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>

      {/* Botón limpiar filtros */}
      {(searchTerm || selectedStatus !== 'all') && (
        <Button onClick={onClearFilters} variant="ghost">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

