'use client';

import { 
  ExclamationTriangleIcon, 
  ShoppingCartIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minimum_stock: number;
  unit_price: number;
  deficit: number;
  status: 'out_of_stock' | 'low_stock';
  inventory_categories: {
    name: string;
  } | null;
}

interface LowStockAlertProps {
  items: LowStockItem[];
  loading?: boolean;
}

export function LowStockAlert({ items, loading = false }: LowStockAlertProps) {
  const { formatMoney } = useOrgCurrency();

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          ⚠️ Inventario Crítico
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-bg-tertiary animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          ⚠️ Inventario Crítico
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCartIcon className="w-8 h-8 text-success" />
          </div>
          <p className="text-text-primary font-medium mb-2">
            ¡Todo está en orden!
          </p>
          <p className="text-text-secondary text-sm">
            No hay productos con stock bajo en este momento
          </p>
        </div>
      </div>
    );
  }

  const outOfStock = items.filter(item => item.status === 'out_of_stock');
  const lowStock = items.filter(item => item.status === 'low_stock');

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Inventario Crítico
            </h3>
            <p className="text-sm text-text-secondary">
              {items.length} {items.length === 1 ? 'producto requiere' : 'productos requieren'} atención
            </p>
          </div>
        </div>

        <Link
          href="/inventarios/productos"
          className="px-4 py-2 bg-primary text-bg-primary rounded-lg font-medium hover:bg-primary-light transition-colors"
        >
          Gestionar Inventario
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-error/10 border border-error/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <XCircleIcon className="w-6 h-6 text-error" />
              <div>
                <p className="text-sm text-text-secondary">Sin Stock</p>
                <p className="text-2xl font-bold text-error">{outOfStock.length}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Urgente</p>
              <p className="text-xs text-error font-medium">Requiere acción inmediata</p>
            </div>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-warning" />
              <div>
                <p className="text-sm text-text-secondary">Stock Bajo</p>
                <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Atención</p>
              <p className="text-xs text-warning font-medium">Reordenar pronto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              p-4 rounded-lg border transition-all hover:shadow-lg
              ${item.status === 'out_of_stock' 
                ? 'bg-error/5 border-error/30 hover:border-error' 
                : 'bg-warning/5 border-warning/30 hover:border-warning'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start space-x-3">
                  <div className={`
                    mt-1 w-2 h-2 rounded-full flex-shrink-0
                    ${item.status === 'out_of_stock' ? 'bg-error' : 'bg-warning'}
                  `} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-text-primary font-medium truncate">
                        {item.name}
                      </h4>
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${item.status === 'out_of_stock' 
                          ? 'bg-error/20 text-error' 
                          : 'bg-warning/20 text-warning'
                        }
                      `}>
                        {item.status === 'out_of_stock' ? 'SIN STOCK' : 'STOCK BAJO'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-text-secondary">
                      <span>SKU: {item.sku}</span>
                      {item.inventory_categories && (
                        <>
                          <span>•</span>
                          <span>{item.inventory_categories.name}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex items-center space-x-6">
                      <div>
                        <p className="text-xs text-text-secondary">Stock Actual</p>
                        <p className={`text-lg font-bold ${
                          item.status === 'out_of_stock' ? 'text-error' : 'text-warning'
                        }`}>
                          {item.quantity}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-text-secondary">Stock Mínimo</p>
                        <p className="text-lg font-bold text-text-primary">
                          {item.minimum_stock}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-text-secondary">Faltante</p>
                        <p className="text-lg font-bold text-primary">
                          {item.deficit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-text-secondary">Costo Reposición</p>
                        <p className="text-lg font-bold text-text-primary">
                          {formatMoney(item.deficit * item.unit_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="ml-4 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-bg-primary transition-colors font-medium text-sm whitespace-nowrap">
                Ordenar Ahora
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Costo total estimado de reposición: 
            <span className="ml-2 text-text-primary font-bold">
              {formatMoney(
                items.reduce((sum, item) => sum + (item.deficit * item.unit_price), 0)
              )}
            </span>
          </p>
          
          <button className="text-primary hover:text-primary-light font-medium text-sm transition-colors">
            Generar orden de compra →
          </button>
        </div>
      </div>
    </div>
  );
}

