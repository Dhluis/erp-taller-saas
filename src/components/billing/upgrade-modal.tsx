"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { FEATURE_NAMES } from "@/types/billing";
import type { LimitError } from "@/types/billing";
import { useCurrencyConverter } from "@/lib/utils/currency-converter";
import { PRICING } from "@/lib/billing/constants";
import { HOTMART_CHECKOUT_URL } from "@/lib/billing/hotmart";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitError?: LimitError;
  featureName?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  limitError,
  featureName,
}: UpgradeModalProps) {
  const { selectedCurrency, convertUSD, formatLocalCurrency } =
    useCurrencyConverter();

  const monthlyLocal = convertUSD(PRICING.monthly.amount, selectedCurrency);
  const isUSD = selectedCurrency === "USD";

  // Obtener nombre legible de la feature
  const getFeatureDisplayName = () => {
    if (featureName) return featureName;

    if (limitError?.feature) {
      const featureMap: Record<string, string> = {
        max_customers: "Clientes",
        max_orders_per_month: "Órdenes mensuales",
        max_inventory_items: "Productos en inventario",
        max_users: "Usuarios",
        whatsapp_enabled: "WhatsApp Business",
        ai_enabled: "Asistente IA",
        advanced_reports: "Reportes Avanzados",
      };
      return featureMap[limitError.feature] || "este recurso";
    }

    return "este recurso";
  };

  const displayFeatureName = getFeatureDisplayName();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[400px] p-4 sm:p-5 bg-slate-900 border-slate-700">
        <DialogHeader className="space-y-1">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-center text-xl text-white">
            Actualiza a Premium
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400 text-xs sm:text-sm">
            {limitError?.message ||
              `Has alcanzado el límite de ${displayFeatureName} en el plan Free.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Información del límite actual */}
          {limitError && (
            <div className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400">Uso actual:</span>
                <span className="font-semibold text-white">
                  {limitError.current} / {limitError.limit}
                </span>
              </div>
            </div>
          )}

          {/* Plan Premium Card */}
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <div className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/20">
                PREMIUM
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-base font-bold flex items-center gap-1.5 mb-2">
                <Crown className="h-4 w-4 text-yellow-400" />
                Acceso Ilimitado
              </h3>

              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {isUSD
                      ? "$170"
                      : formatLocalCurrency(monthlyLocal, selectedCurrency)}
                  </span>
                  <span className="text-xs text-slate-400">/mes</span>
                </div>
                {!isUSD && (
                  <div className="text-[10px] text-slate-500">
                    Cobro base: ${PRICING.monthly.amount} USD/mes
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-2 text-xs sm:text-sm mb-4">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">
                  Clientes y Órdenes Ilimitadas
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Asistente IA y WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">
                  Reportes e Inventario Avanzado
                </span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Ahora no
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-orange-500/20 transition-all duration-200 hover:scale-[1.02]"
            asChild
            onClick={onClose}
          >
            <a href={HOTMART_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
              <Crown className="mr-2 h-4 w-4" />
              Actualizar a Premium
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
