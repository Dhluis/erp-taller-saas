'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RocketLaunchIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function FacturacionPage() {
  const router = useRouter()
  const breadcrumbs = [
    { label: 'Ingresos', href: '/ingresos' },
    { label: 'Facturación', href: '/ingresos/facturacion' }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Facturación" 
          breadcrumbs={breadcrumbs}
        />

        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-2xl w-full">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <RocketLaunchIcon className="h-24 w-24 text-primary opacity-20" />
                    <SparklesIcon className="h-12 w-12 text-primary absolute top-0 right-0 animate-pulse" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">
                    Módulo de Facturación
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <ClockIcon className="h-5 w-5" />
                    <span className="text-lg">Próximamente</span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3 text-muted-foreground max-w-md mx-auto">
                  <p className="text-base">
                    Estamos trabajando en un sistema completo de facturación que incluirá:
                  </p>
                  <ul className="text-left space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      <span>Generación automática de facturas desde cotizaciones</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      <span>Gestión de pagos y cuentas por cobrar</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      <span>Reportes financieros detallados</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      <span>Integración con sistemas de facturación electrónica</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      <span>Control de inventario vinculado a facturación</span>
                    </li>
                  </ul>
                </div>

                {/* Badge */}
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <SparklesIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">En desarrollo</span>
                  </div>
                </div>

                {/* Action */}
                <div className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Mientras tanto, puedes gestionar tus cotizaciones:
                  </p>
                  <Button 
                    onClick={() => router.push('/cotizaciones')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Ir a Cotizaciones
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
