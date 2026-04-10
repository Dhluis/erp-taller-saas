'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, RotateCcw, X, Loader2 } from 'lucide-react';

interface ExitSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess?: () => void;
}

export function ExitSignatureModal({ open, onOpenChange, order, onSuccess }: ExitSignatureModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const supabase = createClient();

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  const handleSave = async () => {
    if (signatureRef.current?.isEmpty()) {
      toast.error('Por favor, solicita la firma del cliente antes de continuar.');
      return;
    }

    setIsSaving(true);
    try {
      const signatureDataUrl = signatureRef.current?.getTrimmedCanvas().toDataURL('image/png');
      if (!signatureDataUrl) throw new Error('No se pudo generar el archivo de imagen');

      // 1. Convertir base64 a Blob
      const base64 = signatureDataUrl.split(',')[1];
      const blob = await fetch(`data:image/png;base64,${base64}`).then(res => res.blob());

      // 2. Subir a Supabase Storage
      const fileName = `exit_${order.id}_${Date.now()}.png`;
      const filePath = `signatures/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, blob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      // 3. Actualizar la Orden de Trabajo
      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          exit_signature_url: filePath,
          exit_signature_date: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      toast.success('Orden completada y entregada correctamente.');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving exit signature:', error);
      toast.error('Error al guardar la firma: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Conformidad de Entrega
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Captura la firma del cliente para confirmar la entrega del vehículo {order.vehicle?.brand} {order.vehicle?.model}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 uppercase font-semibold">Resumen de la Orden</p>
            <p className="text-sm font-medium">#{order.order_number || order.id?.slice(0, 8).toUpperCase()}</p>
            <p className="text-sm text-cyan-400 font-bold mt-1">
              Total a Liquidar: ${Number(order.total_amount || 0).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Firma del Cliente</Label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl bg-white overflow-hidden">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  className: 'w-full h-48 cursor-crosshair'
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-slate-400 hover:text-white"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
            <p className="text-[10px] text-amber-200 leading-tight">
              Aviso: Al firmar, el cliente declara su entera conformidad con los trabajos realizados y el estado físico del vehículo al momento de la entrega.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Finalizar y Entregar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
