'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Sparkles, Mic, Send, ChevronRight, Info, Loader2 } from 'lucide-react';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FloatingAIAssistant() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const handleMagicCreate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'magic-create', payload: { text: input } })
      });
      const result = await response.json();
      if (result.success) {
        const queryParams = new URLSearchParams();
        queryParams.set('openMagicCreate', 'true');
        queryParams.set('aiData', encodeURIComponent(JSON.stringify(result.data)));
        router.push(`/dashboard?${queryParams.toString()}`);
        setInput('');
      }
    } catch (error) {
      toast.error('Error al procesar con Eagles AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mb-8 perspective-1000">
      <div 
        className={cn(
          "relative transition-all duration-700 ease-out transform",
          "bg-gradient-to-r from-[#1e293b]/80 via-[#0f172a]/90 to-[#1e293b]/80",
          "backdrop-blur-xl border border-pink-500/20 rounded-2xl shadow-[0_0_50px_-12px_rgba(236,72,153,0.3)]",
          "p-4 md:p-6",
          isExpanded ? "scale-[1.02] border-pink-500/40" : "scale-100"
        )}
      >
        {/* Glowing brain indicator */}
        <div className="absolute -top-3 -left-3">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 animate-pulse" />
            <div className="relative bg-[#0f172a] border border-pink-500/30 p-2 rounded-xl shadow-lg">
              <Brain className="h-6 w-6 text-pink-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Eagles AI <Sparkles className="h-4 w-4 text-pink-400 fill-pink-400/20" />
              </h2>
            </div>
            
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicCreate()}
                placeholder="Ej: 'Juan Pérez trajo un Corolla 2022 blanco con falla en frenos'..."
                className={cn(
                  "w-full bg-white/5 border-slate-700/50 text-white placeholder:text-slate-500",
                  "rounded-xl py-6 pl-6 pr-32 transition-all duration-300",
                  "focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none",
                  "text-lg font-medium"
                )}
              />
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <VoiceInput
                  onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                  className="h-10 w-10 bg-slate-800/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
                />
                <Button
                  onClick={handleMagicCreate}
                  disabled={loading || !input.trim()}
                  className="h-12 bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-500/20 gap-2 px-6"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span className="hidden sm:inline">Crear con IA</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col border-l border-slate-800 pl-8 w-64 space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Info className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Acceso Directo IA</span>
            </div>
            <p className="text-xs text-slate-400 leading-tight">
              Captura órdenes, clientes y vehículos en segundos usando solo tu voz o lenguaje natural.
            </p>
            <div className="flex gap-2">
               <div className="h-1 w-8 bg-pink-500 rounded-full" />
               <div className="h-1 w-4 bg-slate-700 rounded-full" />
               <div className="h-1 w-4 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
