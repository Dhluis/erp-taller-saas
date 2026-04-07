'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Sparkles, Mic, Send, ChevronRight, Info, Loader2 } from 'lucide-react';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBilling } from '@/hooks/useBilling';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { UpgradeModal } from '@/components/billing/upgrade-modal';

const MAGIC_CREATE_LIMIT_ERROR = {
  type: 'limit_exceeded' as const,
  resource: 'work_order' as const,
  message: 'Eagles AI Magic Create es una función Premium. Captura órdenes, citas e inventario instantáneamente con el poder de la Inteligencia Artificial.',
  feature: 'ai_enabled',
  upgrade_url: '/settings/billing',
  plan_required: 'premium' as const,
};

export function FloatingAIAssistant() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { canUseAI, isLoading: billingLoading } = useBilling();
  const { showUpgradeModal, closeUpgradeModal, showUpgrade, limitError } = useLimitCheck();

  const handleMagicCreate = async () => {
    if (!input.trim()) return;
    if (billingLoading) return;
    
    if (!canUseAI) {
      showUpgrade(MAGIC_CREATE_LIMIT_ERROR);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'magic-create', payload: { text: input } })
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        const actionType = result.data.action_type || 'work-order';
        
        // Guardar en sessionStorage para transferencia robusta
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('eagles_ai_pending_data', JSON.stringify(result.data));
        }

        const queryParams = new URLSearchParams();
        queryParams.set('openMagicCreate', 'true');

        let targetPath = '/ordenes';
        let intentLabel = 'orden de trabajo';
        
        if (actionType === 'inventory') {
          targetPath = '/inventarios/productos';
          intentLabel = 'producto de inventario';
        } else if (actionType === 'appointment') {
          targetPath = '/citas';
          intentLabel = 'cita';
        } else if (actionType === 'quotation') {
          targetPath = '/cotizaciones';
          intentLabel = 'cotización';
        } else if (actionType === 'lead') {
          targetPath = '/leads';
          intentLabel = 'prospecto (lead)';
        }

        toast.success(`Intención detectada: ${intentLabel}. Redirigiendo...`);
        
        // Force refresh if already on the target path to ensure params are picked up
        router.push(`${targetPath}?${queryParams.toString()}`);
        if (pathname === targetPath) {
          router.refresh();
        }
        
        setInput('');
      } else {
        toast.error('No se pudo determinar la intención. Intenta ser más descriptivo.');
      }
    } catch (error) {
      console.error('Error en Eagles AI:', error);
      toast.error('Error al procesar con Eagles AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mb-2 sm:mb-6 perspective-1000">
      <div 
        className={cn(
          "relative transition-all duration-700 ease-out transform",
          "bg-gradient-to-r from-[#1e293b]/80 via-[#0f172a]/90 to-[#1e293b]/80",
          "backdrop-blur-xl border border-pink-500/20 rounded-xl sm:rounded-2xl shadow-[0_0_50px_-12px_rgba(236,72,153,0.3)]",
          "p-3 sm:p-4 md:p-6",
          isExpanded ? "scale-[1.02] border-pink-500/40" : "scale-100"
        )}
      >
        {/* Glowing brain indicator */}
        <div className="absolute -top-3 -left-3">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 animate-pulse" />
            <div className="relative bg-[#0f172a] border border-pink-500/30 p-1.5 sm:p-2 rounded-xl shadow-lg">
              <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-pink-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2 mb-0.5 sm:mb-1 pl-5 sm:pl-0">
              <h2 className="text-sm sm:text-xl font-bold text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                Eagles AI <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-pink-400 fill-pink-400/20" />
              </h2>
            </div>
            
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicCreate()}
                placeholder="Ej: 'Juan trae un Corolla 2022 con fallas...'"
                className={cn(
                  "w-full bg-white/5 border border-slate-700/50 text-white placeholder:text-slate-500",
                  "rounded-xl pl-3 sm:pl-6 pr-[90px] sm:pr-[140px] md:pr-[250px] transition-all duration-300",
                  "focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none",
                  "text-sm sm:text-base md:text-lg font-medium h-11 sm:h-14 md:min-h-[64px]"
                )}
              />
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                <VoiceInput
                  onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                  className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 bg-slate-800/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
                />
                <Button
                  onClick={handleMagicCreate}
                  disabled={loading || !input.trim()}
                  className="h-8 sm:h-10 md:h-12 bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-500/20 gap-1 sm:gap-2 px-2.5 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        limitError={limitError || undefined}
        featureName="Eagles AI Magic Create"
      />
    </div>
  );
}
