'use client';

import { useState } from 'react';
import { MessageSquare, Sparkles, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EaglesAIActionButtonProps {
  workOrderId: string;
  customerPhone?: string | null;
  className?: string;
}

export function EaglesAIActionButton({
  workOrderId,
  customerPhone,
  className
}: EaglesAIActionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft-message',
          payload: { workOrderId, origin: window.location.origin }
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al generar borrador');

      setDraft(result.draft);
      setOpen(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };



  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    toast.success('Mensaje copiado al portapapeles');
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition-all ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        Generar Actualización con IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <MessageSquare className="w-5 h-5" />
              Borrador de Actualización (Eagles AI)
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Revisa y edita el mensaje generado por la IA, luego cópialo para enviarlo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[150px] bg-slate-800 border-slate-700 text-white focus:ring-indigo-500/50"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
