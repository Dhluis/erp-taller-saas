'use client';

import { Package, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onViewMovements: (item: InventoryItem) => void;
}

export default function InventoryTable({
  items,
  loading,
  onEdit,
  onDelete,
  onViewMovements,
}: InventoryTableProps) {
  const { currency } = useOrgCurrency();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const getStockStatus = (quantity: number, minimumStock: number) => {
    if (quantity === 0) {
      return { label: 'Sin Stock', color: 'text-red-400 bg-red-500/20' };
    } else if (quantity <= minimumStock) {
      return { label: 'Stock Bajo', color: 'text-yellow-400 bg-yellow-500/20' };
    } else {
      return { label: 'Disponible', color: 'text-green-400 bg-green-500/20' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg mb-2">No hay items en el inventario</p>
        <p className="text-gray-500 text-sm">Agrega tu primer item para comenzar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">
              Producto
            </th>
            <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">
              SKU
            </th>
            <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">
              Categoría
            </th>
            <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">
              Cantidad
            </th>
            <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">
              Stock Mín.
            </th>
            <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">
              Precio Unit.
            </th>
            <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">
              Estado
            </th>
            <th className="text-center py-4 px-4 text-gray-400 font-medium text-sm">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item.quantity, item.minimum_stock);
            return (
              <tr
                key={item.id}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                {/* Product Name */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-gray-400 text-sm truncate max-w-xs">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* SKU */}
                <td className="py-4 px-4">
                  <span className="text-gray-300 font-mono text-sm">
                    {item.sku}
                  </span>
                </td>

                {/* Category */}
                <td className="py-4 px-4">
                  {item.category ? (
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium">
                      {item.category.name}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Sin categoría</span>
                  )}
                </td>

                {/* Quantity */}
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-white font-semibold text-lg">
                      {item.quantity}
                    </span>
                    {item.quantity <= item.minimum_stock && (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                </td>

                {/* Minimum Stock */}
                <td className="py-4 px-4 text-center">
                  <span className="text-gray-400">{item.minimum_stock}</span>
                </td>

                {/* Unit Price */}
                <td className="py-4 px-4 text-right">
                  <span className="text-white font-medium">
                    {formatCurrency(item.unit_price)}
                  </span>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <div className="flex justify-center">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="py-4 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onViewMovements(item)}
                      className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                      title="Ver movimientos"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

