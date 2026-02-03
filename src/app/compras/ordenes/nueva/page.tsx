'use client';

import { useRouter } from 'next/navigation';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function NuevaOrdenCompraPage() {
  const router = useRouter();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs 
        currentPage="Nueva Orden de Compra"
        parentPages={[
          { label: "Compras", href: "/compras" },
          { label: "Órdenes de Compra", href: "/compras/ordenes" }
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Orden de Compra</h1>
          <p className="text-muted-foreground">Crea una nueva orden de compra para tus proveedores</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <Card>
        <CardHeader>
          <CardTitle>Formulario de Orden de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            El formulario de creación de órdenes de compra se implementará próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
