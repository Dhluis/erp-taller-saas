'use client';

import { CubeIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';

interface Product {
  name: string;
  totalSold: number;
  revenue: number;
}

interface TopProductsProps {
  data: Product[];
  loading?: boolean;
}

export function TopProducts({ data, loading = false }: TopProductsProps) {
  const { formatMoney } = useOrgCurrency();

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          🔧 Top Servicios/Productos
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-bg-tertiary animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          🔧 Top Servicios/Productos
        </h3>
        <div className="text-center py-12">
          <CubeIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No hay datos de productos disponibles</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(p => p.revenue));

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          🔧 Top Servicios/Productos
        </h3>
        <span className="text-sm text-text-secondary">
          Por ingresos
        </span>
      </div>

      <div className="space-y-4">
        {data.map((product, index) => {
          const percentage = (product.revenue / maxRevenue) * 100;
          
          return (
            <div
              key={product.name}
              className="group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${index === 0 ? 'bg-primary/20' : 'bg-bg-tertiary'}
                  `}>
                    <CubeIcon className={`w-5 h-5 ${index === 0 ? 'text-primary' : 'text-text-secondary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {product.totalSold} unidades vendidas
                    </p>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <p className="text-text-primary font-bold">
                    {formatMoney(product.revenue)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center space-x-2 text-text-secondary">
          <ArrowTrendingUpIcon className="w-5 h-5 text-success" />
          <span className="text-sm">Rendimiento excelente</span>
        </div>
        <button className="text-primary hover:text-primary-light font-medium text-sm transition-colors">
          Ver análisis completo →
        </button>
      </div>
    </div>
  );
}

