'use client';

import { useState } from 'react';
import { AlertTriangle, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryItem } from '@/hooks/useInventory';

interface DeleteInventoryModalProps {
  item: InventoryItem | null;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function DeleteInventoryModal({
  item,
  onConfirm,
  onClose,
  loading = false,
}: DeleteInventoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Eliminar Item</h3>
            <p className="text-sm text-gray-400">Esta acción no se puede deshacer</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-white">{item.name}</span>
            </div>
            <div className="text-sm text-gray-400 space-y-1">
              <p>SKU: {item.sku}</p>
              <p>Stock actual: {item.quantity} unidades</p>
              <p>Categoría: {item.category_name || 'Sin categoría'}</p>
            </div>
          </div>

          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              ⚠️ Al eliminar este item, se perderán todos los movimientos y datos asociados.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting || loading}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || loading}
            className="flex-1"
          >
            {isDeleting || loading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Eliminar Item
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)
