'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  FileText, 
  User, 
  Car, 
  Package,
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { results, loading, search } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Buscar cuando cambia el query - CON DEBOUNCE REDUCIDO para respuesta más rápida
  useEffect(() => {
    const trimmedQuery = query.trim();
    
    // Limpiar resultados si el query está vacío
    if (trimmedQuery.length === 0) {
      return;
    }

    // Debounce REDUCIDO: esperar solo 150ms para respuesta más rápida
    const timeoutId = setTimeout(() => {
      console.log('🔍 [GlobalSearch Component] Ejecutando búsqueda para:', trimmedQuery);
      search(trimmedQuery);
    }, 150);

    // Limpiar timeout si el usuario sigue escribiendo
    return () => clearTimeout(timeoutId);
  }, [query, search]);

  // Focus en el input cuando se abre el modal
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Obtener todos los resultados en un array plano
  const allResults = [
    ...results.orders.map(item => ({ ...item, type: 'order' as const })),
    ...results.customers.map(item => ({ ...item, type: 'customer' as const })),
    ...results.vehicles.map(item => ({ ...item, type: 'vehicle' as const })),
    ...results.products.map(item => ({ ...item, type: 'product' as const })),
  ];

  // Log de resultados para debug - MEJORADO
  useEffect(() => {
    if (query.trim().length > 0) {
      console.log('📊 [GlobalSearch Component] Estado actual:', {
        query: query.trim(),
        loading,
        totalResults: allResults.length,
        orders: results.orders.length,
        customers: results.customers.length,
        vehicles: results.vehicles.length,
        products: results.products.length,
        allResultsArray: allResults.slice(0, 3), // Primeros 3 para debug
      });
      
      // Si hay resultados pero no se muestran, forzar re-render
      if (allResults.length > 0 && !loading) {
        console.log('✅ [GlobalSearch] HAY RESULTADOS - Deberían mostrarse:', allResults.length);
      }
    }
  }, [query, loading, allResults.length, results, allResults]);

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(allResults[selectedIndex]);
    }
  };

  // Navegar al resultado seleccionado
  const handleSelectResult = (result: any) => {
    console.log('🎯 [GlobalSearch] Seleccionando resultado:', result);
    
    let path = '';
    
    switch (result.type) {
      case 'order':
        path = `/ordenes/${result.id}`;
        break;
      case 'customer':
        path = `/clientes`;
        break;
      case 'vehicle':
        path = `/vehiculos`;
        break;
      case 'product':
        path = `/inventarios`;
        break;
    }
    
    if (path) {
      // Pequeño delay para que se note el click visual
      setTimeout(() => {
        router.push(path);
        onOpenChange(false);
      }, 100);
    }
  };

  // Obtener icono según tipo
  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'customer':
        return <User className="w-4 h-4 text-green-400" />;
      case 'vehicle':
        return <Car className="w-4 h-4 text-blue-400" />;
      case 'product':
        return <Package className="w-4 h-4 text-purple-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  // Obtener label según tipo
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order':
        return 'Orden';
      case 'customer':
        return 'Cliente';
      case 'vehicle':
        return 'Vehículo';
      case 'product':
        return 'Producto';
      default:
        return type;
    }
  };

  // Formatear resultado según tipo
  const formatResult = (result: any) => {
    switch (result.type) {
      case 'order':
        return {
          title: `Orden ${result.id?.substring(0, 8)}...`,
          subtitle: `${result.customer?.name || 'Sin cliente'} - ${result.vehicle?.brand || ''} ${result.vehicle?.model || ''}`,
          badge: result.status,
        };
      case 'customer':
        return {
          title: result.name,
          subtitle: result.phone || result.email || 'Sin información de contacto',
          badge: null,
        };
      case 'vehicle':
        return {
          title: `${result.brand} ${result.model} ${result.year || ''}`,
          subtitle: result.license_plate || 'Sin placa',
          badge: null,
        };
      case 'product':
        return {
          title: result.name,
          subtitle: `SKU: ${result.sku || 'N/A'} - Stock: ${result.current_stock || 0}`,
          badge: result.current_stock < result.min_stock ? 'Stock Bajo' : null,
        };
      default:
        return { title: 'Resultado', subtitle: '', badge: null };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 bg-slate-900 border-slate-700">
        {/* DialogTitle y DialogDescription agregados para cumplir con requisitos de accesibilidad de Radix UI */}
        <DialogHeader className="sr-only">
          <DialogTitle>Búsqueda Global</DialogTitle>
          <DialogDescription>
            Busca órdenes, clientes, vehículos y productos en el sistema
          </DialogDescription>
        </DialogHeader>
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-700 px-4 py-3">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Buscar órdenes, clientes, vehículos, productos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-slate-400"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </div>

        {/* Results - AUTCOMPLETADO MIENTRAS SE ESCRIBE */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">
                Comienza a escribir para buscar...
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Órdenes, Clientes, Vehículos, Productos
              </p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Buscando "{query}"...</p>
            </div>
          ) : allResults.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 text-sm font-medium mb-1">
                No se encontraron resultados para "{query}"
              </p>
              <p className="text-slate-500 text-xs">
                Intenta con otros términos de búsqueda
              </p>
              {/* Debug info */}
              <div className="mt-4 p-2 bg-slate-800 rounded text-xs text-slate-400">
                <p>Debug: orders={results.orders.length}, customers={results.customers.length}, vehicles={results.vehicles.length}, products={results.products.length}</p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {/* DEBUG: Mostrar total de resultados */}
              {console.log('🎯 [GlobalSearch] RENDERIZANDO RESULTADOS:', {
                total: allResults.length,
                orders: results.orders.length,
                customers: results.customers.length,
                vehicles: results.vehicles.length,
                products: results.products.length,
              })}
              
              {/* Órdenes */}
              {results.orders.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                    Órdenes de Trabajo ({results.orders.length})
                  </div>
                  {results.orders.map((order, index) => {
                    const globalIndex = allResults.findIndex(r => r.type === 'order' && r.id === order.id);
                    const isSelected = globalIndex === selectedIndex;
                    const formatted = formatResult({ ...order, type: 'order' });
                    return (
                      <button
                        key={`order-${order.id}`}
                        onClick={() => handleSelectResult({ ...order, type: 'order' })}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 relative ${
                          isSelected 
                            ? 'bg-cyan-500/30 border-l-4 border-cyan-400 shadow-xl shadow-cyan-500/30 backdrop-blur-md ring-2 ring-cyan-400/50 scale-[1.02]' 
                            : 'hover:bg-slate-800/50 border-l-4 border-transparent hover:border-slate-600'
                        }`}
                      >
                        {/* Indicador de selección */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r-full animate-pulse" />
                        )}
                        
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className={`transition-all duration-200 ${isSelected ? 'scale-110' : ''}`}>
                            {getIcon('order')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate transition-all duration-200 ${
                              isSelected ? 'text-cyan-200 font-semibold' : 'text-white'
                            }`}>
                              {formatted.title}
                            </div>
                            <div className={`text-xs truncate transition-all duration-200 ${
                              isSelected ? 'text-cyan-300/80' : 'text-slate-400'
                            }`}>
                              {formatted.subtitle}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {formatted.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {formatted.badge}
                            </Badge>
                          )}
                          <ArrowRight className={`w-4 h-4 transition-all duration-200 ${
                            isSelected ? 'text-cyan-400 scale-110' : 'text-slate-500'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Clientes */}
              {results.customers.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                    Clientes ({results.customers.length})
                  </div>
                  {results.customers.map((customer) => {
                    const globalIndex = allResults.findIndex(r => r.type === 'customer' && r.id === customer.id);
                    const isSelected = globalIndex === selectedIndex;
                    const formatted = formatResult({ ...customer, type: 'customer' });
                    return (
                      <button
                        key={`customer-${customer.id}`}
                        onClick={() => handleSelectResult({ ...customer, type: 'customer' })}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 relative ${
                          isSelected 
                            ? 'bg-green-500/30 border-l-4 border-green-400 shadow-xl shadow-green-500/30 backdrop-blur-md ring-2 ring-green-400/50 scale-[1.02]' 
                            : 'hover:bg-slate-800/50 border-l-4 border-transparent hover:border-slate-600'
                        }`}
                      >
                        {/* Indicador de selección */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400 rounded-r-full animate-pulse" />
                        )}
                        
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className={`transition-all duration-200 ${isSelected ? 'scale-110' : ''}`}>
                            {getIcon('customer')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate transition-all duration-200 ${
                              isSelected ? 'text-green-200 font-semibold' : 'text-white'
                            }`}>
                              {formatted.title}
                            </div>
                            <div className={`text-xs truncate transition-all duration-200 ${
                              isSelected ? 'text-green-300/80' : 'text-slate-400'
                            }`}>
                              {formatted.subtitle}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 transition-all duration-200 ${
                          isSelected ? 'text-green-400 scale-110' : 'text-slate-500'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Vehículos */}
              {results.vehicles.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                    Vehículos ({results.vehicles.length})
                  </div>
                  {results.vehicles.map((vehicle) => {
                    const globalIndex = allResults.findIndex(r => r.type === 'vehicle' && r.id === vehicle.id);
                    const isSelected = globalIndex === selectedIndex;
                    const formatted = formatResult({ ...vehicle, type: 'vehicle' });
                    return (
                      <button
                        key={`vehicle-${vehicle.id}`}
                        onClick={() => handleSelectResult({ ...vehicle, type: 'vehicle' })}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 relative ${
                          isSelected 
                            ? 'bg-blue-500/30 border-l-4 border-blue-400 shadow-xl shadow-blue-500/30 backdrop-blur-md ring-2 ring-blue-400/50 scale-[1.02]' 
                            : 'hover:bg-slate-800/50 border-l-4 border-transparent hover:border-slate-600'
                        }`}
                      >
                        {/* Indicador de selección */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r-full animate-pulse" />
                        )}
                        
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className={`transition-all duration-200 ${isSelected ? 'scale-110' : ''}`}>
                            {getIcon('vehicle')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate transition-all duration-200 ${
                              isSelected ? 'text-blue-200 font-semibold' : 'text-white'
                            }`}>
                              {formatted.title}
                            </div>
                            <div className={`text-xs truncate transition-all duration-200 ${
                              isSelected ? 'text-blue-300/80' : 'text-slate-400'
                            }`}>
                              {formatted.subtitle}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 transition-all duration-200 ${
                          isSelected ? 'text-blue-400 scale-110' : 'text-slate-500'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Productos */}
              {results.products.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                    Productos ({results.products.length})
                  </div>
                  {results.products.map((product) => {
                    const globalIndex = allResults.findIndex(r => r.type === 'product' && r.id === product.id);
                    const isSelected = globalIndex === selectedIndex;
                    const formatted = formatResult({ ...product, type: 'product' });
                    return (
                      <button
                        key={`product-${product.id}`}
                        onClick={() => handleSelectResult({ ...product, type: 'product' })}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 relative ${
                          isSelected 
                            ? 'bg-purple-500/30 border-l-4 border-purple-400 shadow-xl shadow-purple-500/30 backdrop-blur-md ring-2 ring-purple-400/50 scale-[1.02]' 
                            : 'hover:bg-slate-800/50 border-l-4 border-transparent hover:border-slate-600'
                        }`}
                      >
                        {/* Indicador de selección */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-r-full animate-pulse" />
                        )}
                        
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className={`transition-all duration-200 ${isSelected ? 'scale-110' : ''}`}>
                            {getIcon('product')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate transition-all duration-200 ${
                              isSelected ? 'text-purple-200 font-semibold' : 'text-white'
                            }`}>
                              {formatted.title}
                            </div>
                            <div className={`text-xs truncate transition-all duration-200 ${
                              isSelected ? 'text-purple-300/80' : 'text-slate-400'
                            }`}>
                              {formatted.subtitle}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {formatted.badge && (
                            <Badge variant="destructive" className="text-xs">
                              {formatted.badge}
                            </Badge>
                          )}
                          <ArrowRight className={`w-4 h-4 transition-all duration-200 ${
                            isSelected ? 'text-purple-400 scale-110' : 'text-slate-500'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {query.trim().length > 0 && allResults.length > 0 && (
          <div className="border-t border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>↑↓ Navegar</span>
              <span>↵ Abrir</span>
              <span>ESC Cerrar</span>
            </div>
            <span>{allResults.length} resultados</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}








