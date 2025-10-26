'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { 
  Wrench, 
  Calendar, 
  Camera, 
  FileText, 
  Users, 
  TrendingUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Car,
  Clock,
  Shield
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* HEADER/NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EAGLES ERP</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Características
            </Link>
            <Link href="#benefits" className="text-sm font-medium hover:text-primary transition-colors">
              Beneficios
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Precios
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild className="bg-primary text-white hover:bg-primary/90">
              <Link href="/auth/register">
                Probar Gratis - 7 días
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="container py-24 md:py-32 space-y-8">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="px-4 py-2">
              <Sparkles className="mr-2 h-4 w-4 inline" />
              Sistema de Gestión Profesional
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Administra tu{' '}
            <span className="text-primary">Taller Mecánico</span>
            {' '}con Inteligencia
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Gestiona órdenes de trabajo, clientes, vehículos y finanzas desde una plataforma 
            moderna y fácil de usar. Diseñada para talleres que quieren crecer.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button size="lg" asChild className="text-lg h-12 px-8 bg-primary text-white hover:bg-primary/90">
              <Link href="/auth/register">
                Probar Gratis - 7 días
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg h-12 px-8">
              <Link href="#features">
                Ver Demo
                <Camera className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Talleres Activos</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Órdenes Gestionadas</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>

        {/* Screenshot/Image Placeholder */}
        <div className="relative mx-auto max-w-5xl mt-16">
          <div className="rounded-xl border bg-card shadow-2xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <Car className="h-24 w-24 mx-auto text-primary/50" />
                <p className="text-muted-foreground">Vista previa del dashboard</p>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-500"></div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="container py-24 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="secondary">Características</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-lg text-muted-foreground">
            Herramientas poderosas diseñadas específicamente para talleres mecánicos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Gestión de Órdenes</CardTitle>
              <CardDescription>
                Sistema Kanban visual para seguimiento de órdenes desde recepción hasta entrega
              </CardDescription>
            </CardHeader>
          </Card>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Fotos y Documentos</CardTitle>
              <CardDescription>
                Captura fotos directamente desde tu móvil y organiza documentos por categoría
              </CardDescription>
            </CardHeader>
          </Card>
          </motion.div>

          {/* Feature 3 */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Clientes y Vehículos</CardTitle>
              <CardDescription>
                Base de datos completa con historial de servicios y mantenimientos
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 4 */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reportes y Analytics</CardTitle>
              <CardDescription>
                Dashboard con métricas en tiempo real para tomar decisiones informadas
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 5 */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Cotizaciones</CardTitle>
              <CardDescription>
                Genera cotizaciones profesionales y da seguimiento a aprobaciones
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Feature 6 */}
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>100% Seguro</CardTitle>
              <CardDescription>
                Tus datos protegidos con cifrado de nivel empresarial y backups automáticos
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section id="benefits" className="container py-24 space-y-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="secondary">Beneficios</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ahorra tiempo y aumenta tus ganancias
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Reduce tiempo administrativo en 60%</h3>
                  <p className="text-muted-foreground text-sm">
                    Automatiza tareas repetitivas y enfócate en reparar vehículos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Mejora la comunicación con clientes</h3>
                  <p className="text-muted-foreground text-sm">
                    Mantén a tus clientes informados con actualizaciones en tiempo real
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Aumenta ingresos un 30%</h3>
                  <p className="text-muted-foreground text-sm">
                    Gestiona más órdenes eficientemente y reduce tiempos muertos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Acceso desde cualquier dispositivo</h3>
                  <p className="text-muted-foreground text-sm">
                    Web, tablet o móvil - tu taller siempre a tu alcance
                  </p>
                </div>
              </div>
            </div>

            <Button size="lg" asChild className="mt-6 bg-primary text-white hover:bg-primary/90">
              <Link href="/auth/register">
                Probar Gratis - 7 días
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <Card className="border-2">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">Tiempo Promedio de Orden</div>
                      <div className="text-2xl font-bold text-primary">-45%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">Satisfacción de Clientes</div>
                      <div className="text-2xl font-bold text-primary">+85%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <div className="font-semibold">Retención de Clientes</div>
                      <div className="text-2xl font-bold text-primary">+92%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="container py-24">
        <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">
              ¿Listo para transformar tu taller?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Únete a cientos de talleres que ya están optimizando sus operaciones con EAGLES ERP
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="text-lg h-12 px-8 bg-primary text-white hover:bg-primary/90">
                <Link href="/auth/register">
                  Probar Gratis - 7 días
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg h-12 px-8">
                <Link href="mailto:contacto@eagles.com">
                  Contactar Ventas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-secondary/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">EAGLES ERP</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                El sistema de gestión más completo para talleres mecánicos modernos.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Producto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary transition-colors">Características</Link></li>
                <li><Link href="#pricing" className="hover:text-primary transition-colors">Precios</Link></li>
                <li><Link href="/auth/login" className="hover:text-primary transition-colors">Iniciar Sesión</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Soporte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Ayuda</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contacto</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Estado</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 EAGLES ERP. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
