'use client';

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Search, Filter, X } from 'lucide-react';

interface QuotationFiltersProps {
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export function QuotationFilters({ onFiltersChange, onClearFilters }: QuotationFiltersProps) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    amountMin: '',
    amountMax: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      customer: '',
      amountMin: '',
      amountMax: ''
    };
    setFilters(clearedFilters);
    onClearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Cotizaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Búsqueda</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <Input
              placeholder="Nombre del cliente"
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha desde</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha hasta</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monto mínimo</label>
            <Input
              type="number"
              placeholder="0.00"
              value={filters.amountMin}
              onChange={(e) => handleFilterChange('amountMin', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monto máximo</label>
            <Input
              type="number"
              placeholder="0.00"
              value={filters.amountMax}
              onChange={(e) => handleFilterChange('amountMax', e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <Badge variant="secondary" className="flex items-center gap-1">
              Filtros activos
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}















