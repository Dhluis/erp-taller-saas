'use client';

import { Search, Filter, Package } from 'lucide-react';

interface InventoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showLowStock: boolean;
  onLowStockToggle: () => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: Array<{ id: string; name: string }>;
}

export default function InventoryFilters({
  searchTerm,
  onSearchChange,
  showLowStock,
  onLowStockToggle,
  selectedCategory,
  onCategoryChange,
  categories,
}: InventoryFiltersProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle */}
        <button
          onClick={onLowStockToggle}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            showLowStock
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
              : 'bg-gray-900/50 text-gray-400 border border-gray-600/50 hover:bg-gray-800/50'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Stock Bajo</span>
          {showLowStock && (
            <span className="ml-1 px-2 py-0.5 bg-red-500/30 text-red-300 text-xs rounded-full">
              Activo
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

