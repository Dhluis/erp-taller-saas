'use client';

import { useState, useEffect } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { InventoryItem, InventoryCategory } from '@/hooks/useInventory';
import { VoiceInput } from '@/components/ui/VoiceInput';

interface InventoryFormProps {
  item?: InventoryItem | null;
  categories: InventoryCategory[];
  onSubmit: (data: any) => void;
  onClose: () => void;
  loading: boolean;
}

export default function InventoryForm({
  item,
  categories,
  onSubmit,
  onClose,
  loading,
}: InventoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    quantity: 0,
    minimum_stock: 0,
    purchase_price: '' as number | '',
    unit_price: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        sku: item.sku || '',
        category_id: item.category_id || '',
        quantity: item.quantity || 0,
        minimum_stock: item.minimum_stock || 0,
        purchase_price: item.purchase_price ?? '',
        unit_price: item.unit_price || 0,
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'El SKU es requerido';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'La cantidad no puede ser negativa';
    }

    if (formData.minimum_stock < 0) {
      newErrors.minimum_stock = 'El stock mínimo no puede ser negativo';
    }

    if (formData.unit_price < 0) {
      newErrors.unit_price = 'El precio no puede ser negativo';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstKey = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }, 80);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const numericFields = ['quantity', 'minimum_stock', 'unit_price'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? parseFloat(value) || 0
        : name === 'purchase_price'
          ? value === '' ? '' : parseFloat(value) || 0
          : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {item ? 'Editar Item' : 'Nuevo Item de Inventario'}
              </h2>
              <p className="text-gray-400 text-sm">
                {item ? 'Actualiza la información del item' : 'Agrega un nuevo item al inventario'}
                <span className="ml-2 text-xs"><span className="text-red-400">*</span> Campos obligatorios</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Banner campos obligatorios */}
          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">Completa los campos obligatorios</p>
                <p className="text-red-400/70 text-xs mt-0.5">
                  {Object.keys(errors).map(k => ({
                    name: 'Nombre', sku: 'SKU', category_id: 'Categoría',
                    quantity: 'Cantidad', minimum_stock: 'Stock mínimo', unit_price: 'Precio de venta'
                  }[k] || k)).join(' · ')}
                </p>
              </div>
            </div>
          )}
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 pr-12`}
                placeholder="Ej: Filtro de Aceite"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInput
                  onTranscript={(text) => setFormData(prev => ({ ...prev, name: prev.name ? `${prev.name} ${text}` : text }))}
                  className="h-8 w-8"
                />
              </div>
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <div className="relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none pr-12"
                placeholder="Descripción opcional del producto"
              />
              <div className="absolute right-2 top-2">
                <VoiceInput
                  onTranscript={(text) => setFormData(prev => ({ ...prev, description: prev.description ? `${prev.description} ${text}` : text }))}
                  className="h-8 w-8"
                />
              </div>
            </div>
          </div>

          {/* SKU & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.sku ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono`}
                placeholder="FIL-001"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-400">{errors.sku}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.category_id ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-400">{errors.category_id}</p>
              )}
            </div>
          </div>

          {/* Quantity & Minimum Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="1"
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.quantity ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                placeholder="0"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stock Mínimo
              </label>
              <input
                type="number"
                name="minimum_stock"
                value={formData.minimum_stock}
                onChange={handleChange}
                min="0"
                step="1"
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.minimum_stock ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                placeholder="0"
              />
              {errors.minimum_stock && (
                <p className="mt-1 text-sm text-red-400">{errors.minimum_stock}</p>
              )}
            </div>
          </div>

          {/* Costo de compra & Precio de venta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Costo de Compra
              </label>
              <p className="text-xs text-gray-500 mb-2">Lo que pagas al proveedor</p>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="0.00 (opcional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Precio de Venta <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Lo que cobras al cliente</p>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-2.5 bg-gray-800/50 border ${
                  errors.unit_price ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                placeholder="0.00"
              />
              {errors.unit_price && (
                <p className="mt-1 text-sm text-red-400">{errors.unit_price}</p>
              )}
            </div>
          </div>

          {/* Margen calculado */}
          {formData.purchase_price !== '' && formData.purchase_price > 0 && formData.unit_price > 0 && (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-sm text-emerald-400">
                Margen:{' '}
                <span className="font-bold">
                  {(((formData.unit_price - (formData.purchase_price as number)) / (formData.purchase_price as number)) * 100).toFixed(1)}%
                </span>
                {' '}— Ganancia por pieza:{' '}
                <span className="font-bold">
                  ${(formData.unit_price - (formData.purchase_price as number)).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.sku.trim() || !formData.category_id}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{item ? 'Actualizar' : 'Crear Item'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

