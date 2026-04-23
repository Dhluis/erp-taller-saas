"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Zap, AlertCircle, ChevronDown } from "lucide-react";
import { useBilling } from "@/hooks/useBilling";
import {
  PRICING,
  FEATURES,
  detectUserCountry,
  type CountryCode,
} from "@/lib/billing/constants";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { CurrencySelectorGlobal } from "@/components/currency/CurrencySelectorGlobal";

import { useCurrencyConverter } from "@/lib/utils/currency-converter";

const BILLING_FAQS = [
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer:
      "Sí, puedes cancelar tu suscripción cuando quieras. Los cambios se aplicarán en el próximo período de facturación.",
  },
  {
    question: "¿Qué sucede si cancelo mi suscripción?",
    answer:
      "Mantendrás acceso a Premium hasta el final de tu período pagado, luego volverás automáticamente al plan Free.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos todas las tarjetas de crédito y débito principales a través de Hotmart.",
  },
  {
    question: "¿Cómo funciona el plan Free?",
    answer:
      "El plan Free es gratuito para siempre. Incluye hasta 20 clientes, 20 órdenes por mes, 30 productos en inventario y 2 usuarios. Sin tarjeta de crédito. Cuando quieras más capacidad o funciones Premium (WhatsApp, asistente IA, reportes avanzados, etc.), puedes actualizar en cualquier momento.",
  },
  {
    question: "¿Puedo tener varios usuarios en mi taller?",
    answer:
      "Sí. El plan Free incluye hasta 2 usuarios activos. Con Premium tienes usuarios ilimitados para tu equipo.",
  },
  {
    question: "¿Qué incluye el soporte prioritario?",
    answer:
      "Prioridad en respuestas por email y canal dedicado. Incluye ayuda con configuración, integraciones y mejores prácticas para tu taller.",
  },
] as const;

const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/F105392844W";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { plan, isLoading } = useBilling();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [userCountry, setUserCountry] = useState<CountryCode>("US");
  const { toast } = useToast();

  const { selectedCurrency, convertUSD, formatLocalCurrency } =
    useCurrencyConverter();
  const monthlyLocal = convertUSD(PRICING.monthly.amount, selectedCurrency);
  const isUSD = selectedCurrency === "USD";

  useEffect(() => {
    const detected = detectUserCountry();
    setUserCountry(detected);
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    if (searchParams.get("canceled") === "true") {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Cargando información de billing...
          </p>
        </div>
      </div>
    );
  }

  const isPremium = plan?.plan_tier === "premium";
  const isActive = plan?.subscription_status === "active";
  const isTrial = plan?.subscription_status === "trial";

  const showSubscribeButton = !isActive;
  const isFreeOrTrialOrExpired = !isActive;

  const handleSubscribe = () => {
    window.open(HOTMART_CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  const getSubscribeButtonText = () => {
    if (isTrial) return "Activar Suscripción";
    if (isPremium) return "Suscribirse Ahora";
    return "Suscribirse Ahora";
  };

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ¡Bienvenido a Premium! Tu plan se activará en breve.
          </AlertDescription>
        </Alert>
      )}

      {showCanceled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Proceso cancelado. No se realizó ningún cargo.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Planes y Suscripciones
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium h-5 animate-pulse"
            >
              📍 Detectado: {userCountry}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tu plan y métodos de pago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Divisa:</span>
          <CurrencySelectorGlobal />
        </div>
      </div>

      {isPremium && isActive && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle>Plan Premium Activo</CardTitle>
              </div>
              <Badge variant="success">ACTIVO</Badge>
            </div>
            <CardDescription>
              {plan.current_period_end && (
                <>
                  Próxima renovación:{" "}
                  {new Date(plan.current_period_end).toLocaleDateString(
                    "es-MX",
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isTrial && (
        <Card className="border-2 border-yellow-400">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle>Período de Prueba</CardTitle>
              </div>
              <Badge className="bg-yellow-500 text-white">TRIAL</Badge>
            </div>
            <CardDescription>
              Estás disfrutando de Premium gratis. ¡Suscríbete para no perder el
              acceso!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <Card
          className={cn(
            "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
            !isPremium
              ? "border-2 border-primary ring-1 ring-primary/20 shadow-primary/5 shadow-xl"
              : "border-border/60 hover:border-primary/30",
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle>Plan Free</CardTitle>
              </div>
              {!isPremium && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  PLAN ACTUAL
                </Badge>
              )}
            </div>
            <div className="mt-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/siempre</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ideal para mini-talleres que recién comienzan.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {FEATURES.free.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 group/feat">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center group-hover/feat:bg-blue-500/20 transition-colors">
                    <Check className="h-3 w-3 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
              <div className="pt-4 space-y-3 border-t border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-1">
                  No incluido
                </p>
                {FEATURES.premium_only.map((feature, i) => (
                  <li
                    key={`not-${i}`}
                    className="flex items-start gap-3 opacity-40"
                  >
                    <X className="mt-0.5 h-3 w-3 text-red-500/70 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground line-through decoration-red-500/20">
                      {feature}
                    </span>
                  </li>
                ))}
              </div>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-400 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              PREMIUM
            </Badge>
          </div>

          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-2xl">Plan Premium</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {isUSD
                    ? PRICING.monthly.displayPrice.split(" ")[0]
                    : formatLocalCurrency(monthlyLocal, selectedCurrency)}
                </span>
                <span className="text-foreground/70">
                  {PRICING.monthly.displayInterval}
                </span>
              </div>
              {!isUSD && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cobro base: {PRICING.monthly.displayPrice}
                </p>
              )}
              {isTrial && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    🎁 Estás en período de prueba. ¡Suscríbete para mantener el
                    acceso!
                  </p>
                </div>
              )}
              {showSubscribeButton && (
                <Button
                  onClick={handleSubscribe}
                  size="lg"
                  className="w-full mt-4 h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20"
                >
                  <Crown className="mr-2 h-5 w-5" />
                  {getSubscribeButtonText()}
                </Button>
              )}
            </div>

            <ul className="space-y-3 pt-4 border-t">
              {FEATURES.premium.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 group/feat">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover/feat:bg-emerald-500/20 transition-colors">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium">
                    {feature.replace("✅ ", "")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <CardDescription>
            Haz clic en una pregunta para ver la respuesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {BILLING_FAQS.map((faq, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div
                  key={index}
                  className={cn(
                    "rounded-lg border overflow-hidden transition-all duration-300",
                    isOpen
                      ? "border-primary/40 shadow-sm shadow-primary/5"
                      : "border-border hover:border-primary/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 py-3.5 px-4 text-left transition-all duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                      isOpen
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/40 text-foreground",
                    )}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-trigger-${index}`}
                  >
                    <span className="font-medium pr-2">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-300",
                        isOpen
                          ? "rotate-180 text-primary"
                          : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${index}`}
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border/50 mx-4" />
                      <p className="text-sm text-muted-foreground py-3.5 px-4 leading-relaxed bg-muted/20">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
