'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Insight {
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM';
  actionLabel: string;
  actionLink: string;
}

export function EaglesInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-insights' })
        });
        const data = await response.json();
        if (data.success && data.insights) {
          setInsights(data.insights);
        }
      } catch (error) {
        console.error('Error fetching AI insights:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#0b1120] border-slate-800 shadow-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-pink-500 animate-pulse" />
              Insights de Eagles AI
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] h-5">
              EN VIVO
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) return null;

  return (
    <Card className="bg-[#0b1120] border-slate-800 shadow-2xl overflow-hidden relative group">
      {/* Subtle background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/5 blur-[80px] rounded-full group-hover:bg-pink-500/10 transition-colors" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <div className="p-1.5 bg-pink-500/10 rounded-lg">
              <Brain className="h-5 w-5 text-pink-500" />
            </div>
            Insights de Eagles AI
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 tracking-wider">EN VIVO</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative px-4 sm:px-6 pb-6 mt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {insights.map((insight, index) => (
            <div 
              key={index} 
              className="group/item flex flex-col p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-pink-500/30 transition-all duration-500 shadow-xl"
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex-1">
                  <h4 className="text-sm lg:text-base font-black text-slate-100 leading-tight group-hover/item:text-white transition-colors">
                    {insight.title}
                  </h4>
                </div>
                <Badge 
                  className={cn(
                    "text-[9px] px-2 py-0.5 h-5 font-black border-none shadow-sm",
                    insight.severity === 'HIGH' 
                      ? "bg-rose-500/20 text-rose-400" 
                      : "bg-amber-500/20 text-amber-400"
                  )}
                >
                  {insight.severity}
                </Badge>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-3 group-hover/item:text-slate-300 transition-colors">
                {insight.description}
              </p>

              <div className="mt-auto pt-4 border-t border-slate-800/50">
                <Link 
                  href={insight.actionLink || '#'} 
                  className="group/btn inline-flex items-center gap-2 text-xs font-black text-pink-400 hover:text-pink-300 transition-all uppercase tracking-wider"
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800/50 flex justify-center">
          <p className="text-[10px] text-slate-500 italic font-medium tracking-wide bg-slate-900/50 px-4 py-1 rounded-full">
            * Estos insights son generados por Eagles AI basados en el análisis profundo de tu taller en tiempo real.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
