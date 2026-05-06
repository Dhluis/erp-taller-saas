"use client";

import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOTMART_CHECKOUT_URL } from "@/lib/billing/hotmart";

interface UpgradeButtonProps {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
}

export function UpgradeButton({
  variant = "default",
  size = "md",
  className,
}: UpgradeButtonProps) {
  const isOutline = variant === "outline";

  return (
    <Button
      asChild
      variant={isOutline ? "outline" : "default"}
      size={size}
      className={cn(
        "transition-transform duration-200 hover:scale-[1.03]",
        !isOutline &&
          "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white border-0 shadow-sm",
        className,
      )}
    >
      <a href={HOTMART_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
        <Crown className="mr-2 h-4 w-4" />
        Suscribirse (Mensual)
      </a>
    </Button>
  );
}
