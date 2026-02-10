'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CURRENCIES, type OrgCurrencyCode, useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Globe } from 'lucide-react'

/**
 * Selector global de divisa para la organización.
 * Persiste en company_settings.currency y se propaga a toda la app.
 */
export function CurrencySelectorGlobal({ className }: { className?: string }) {
  const { currency, setCurrency } = useOrgCurrency()

  return (
    <div className={className}>
      <Select
        value={currency}
        onValueChange={(v) => setCurrency(v as OrgCurrencyCode)}
      >
        <SelectTrigger className="w-[190px] h-8 text-xs bg-background/50 border-border/50">
          <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem key={code} value={code} className="text-xs">
              {info.flag} {info.name} ({code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
