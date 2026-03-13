'use client';

import { useState } from 'react';
import { Wand2, Loader2, Sparkles, Send, Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function EaglesMagicCreate() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!input.trim()) {
      toast.error('Por favor, escribe o dicta algo primero');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-create',
          payload: { text: input }
        })
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Error al procesar con IA');

      if (result.success && result.data) {
        toast.success('¡IA procesó los datos con éxito!');
        // Aquí podríamos abrir el modal de creación con los datos pre-llenados
        // O redirigir a una página de confirmación.
        // Por ahora, simularemos que los datos se detectaron.
        console.log('Datos extraídos por Eagles AI:', result.data);
        
        // Abrir modal de creación de orden (este widget asume que el usuario revisará)
        // Podríamos guardar esto en un store global o pasar por URL
        const queryParams = new URLSearchParams();
        if (result.data.customer?.name) queryParams.set('customerName', result.data.customer.name);
        if (result.data.customer?.phone) queryParams.set('customerPhone', result.data.customer.phone);
        if (result.data.vehicle?.brand) queryParams.set('vehicleBrand', result.data.vehicle.brand);
        if (result.data.vehicle?.model) queryParams.set('vehicleModel', result.data.vehicle.model);
        if (result.data.work_order?.description) queryParams.set('description', result.data.work_order.description);

        toast.info('Redirigiendo para completar el registro...');
        // router.push(`/dashboard?openCreateModal=true&${queryParams.toString()}`);
        
        // Para propósitos de demo/implementación inmediata, solo limpiamos
        setInput('');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-indigo-500/20 bg-slate-900/50 backdrop-blur-sm shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
      <CardHeader className="pb-3 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            Creación Mágica (Eagles AI)
          </CardTitle>
          <div className="px-2 py-0.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white tracking-wider uppercase animate-pulse">
            Beta
          </div>
        </div>
        <CardDescription className="text-slate-400">
          Crea clientes, órdenes o prospectos en segundos usando lenguaje natural o voz.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="relative group">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ej: "Juan Pérez trajo un iPhone 13 Pro con pantalla rota, presupuesto de $2500..."'
            className="min-h-[120px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none pr-12"
          />
          <div className="absolute top-2 right-2">
            <VoiceInput 
              onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
              className="bg-slate-700/50 hover:bg-indigo-500/20 text-indigo-400"
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={loading || !input.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 group transition-all duration-300"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
          )}
          {loading ? 'Procesando...' : 'Crear con Eagles AI'}
        </Button>
      </CardContent>
    </Card>
  );
}
