'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle, Star, Users, Wrench, BarChart3, Shield, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ERP Taller</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Probar Gratis - 7 días
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              ✨ Nuevo: Sistema de Mecánicos
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Gestiona tu taller de manera
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                {' '}inteligente
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              El ERP más completo para talleres automotrices. Controla órdenes, inventario, 
              mecánicos y facturación desde una sola plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8">
                Probar Gratis - 7 días
              </Button>
            </Link>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                Ver Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Todo lo que necesitas para tu taller
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Herramientas profesionales diseñadas específicamente para talleres automotrices
            </p>
          </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatedCard delay={0.1}>
              <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
                <CardHeader>
                  <Wrench className="w-12 h-12 text-cyan-400 mb-4" />
                  <CardTitle className="text-white">Gestión de Mecánicos</CardTitle>
                  <CardDescription className="text-slate-400">
                    Asigna órdenes, controla especialidades y monitorea rendimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Dashboard individual por mecánico
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Asignación automática de órdenes
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Control de especialidades
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
                <CardHeader>
                  <BarChart3 className="w-12 h-12 text-cyan-400 mb-4" />
                  <CardTitle className="text-white">Órdenes de Trabajo</CardTitle>
                  <CardDescription className="text-slate-400">
                    Control completo del flujo de trabajo desde recepción hasta entrega
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Vista Kanban interactiva
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Seguimiento en tiempo real
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Notificaciones automáticas
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={0.3}>
              <Card className="bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
                <CardHeader>
                  <Users className="w-12 h-12 text-cyan-400 mb-4" />
                  <CardTitle className="text-white">Gestión de Clientes</CardTitle>
                  <CardDescription className="text-slate-400">
                    Base de datos completa de clientes y vehículos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Historial completo de servicios
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Gestión de vehículos
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                      Comunicación integrada
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>
              </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-white mb-6">
                Aumenta la eficiencia de tu taller
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Con nuestro sistema, podrás gestionar todos los aspectos de tu taller 
                desde una sola plataforma, aumentando la productividad y reduciendo errores.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Zap className="w-6 h-6 text-cyan-400 mr-3" />
                  <span className="text-slate-300">Reducción del 40% en tiempo de gestión</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-6 h-6 text-cyan-400 mr-3" />
                  <span className="text-slate-300">Datos seguros y respaldados</span>
                </div>
                <div className="flex items-center">
                  <BarChart3 className="w-6 h-6 text-cyan-400 mr-3" />
                  <span className="text-slate-300">Reportes detallados y análisis</span>
                </div>
          </div>
            </motion.div>
              <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-slate-800/50 rounded-xl p-8 border border-slate-700"
            >
              <h3 className="text-2xl font-bold text-white mb-4">¿Listo para empezar?</h3>
              <p className="text-slate-300 mb-6">
                Únete a cientos de talleres que ya confían en nuestro sistema
              </p>
              <div className="flex items-center mb-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 bg-cyan-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{i}</span>
                    </div>
                  ))}
                </div>
                <span className="ml-3 text-slate-300">+500 talleres confían en nosotros</span>
              </div>
              <Link href="/auth/register">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                  Comenzar ahora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="container mx-auto text-center">
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
            ¿Listo para transformar tu taller?
          </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Comienza tu prueba gratuita de 7 días. Sin compromisos, sin tarjeta de crédito.
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8">
              Probar Gratis - 7 días
            </Button>
          </Link>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                Contactar Ventas
              </Button>
            </div>
        </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
                </div>
              <span className="text-xl font-bold text-white">ERP Taller</span>
              </div>
            <div className="text-slate-400 text-sm">
              © 2024 ERP Taller. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Wrench,
    title: "Gestión de Órdenes",
    description: "Administra órdenes de trabajo de manera eficiente con seguimiento en tiempo real."
  },
  {
    icon: Users,
    title: "Control de Clientes",
    description: "Mantén un registro completo de clientes, vehículos e historial de servicios."
  },
  {
    icon: BarChart3,
    title: "Reportes Avanzados",
    description: "Analiza el rendimiento de tu taller con reportes detallados y métricas clave."
  },
  {
    icon: Shield,
    title: "Seguridad Garantizada",
    description: "Tus datos están protegidos con encriptación de nivel empresarial."
  },
  {
    icon: Clock,
    title: "Tiempo Real",
    description: "Actualizaciones instantáneas y sincronización en la nube."
  },
  {
    icon: Database,
    title: "Inventario Inteligente",
    description: "Controla tu inventario con alertas automáticas de stock bajo."
  }
]

const benefits = [
  "Aumenta la productividad de tu taller hasta un 40%",
  "Reduce errores administrativos y mejora la precisión",
  "Acceso desde cualquier lugar, en cualquier momento",
  "Soporte técnico dedicado incluido",
  "Actualizaciones continuas sin costo adicional",
  "Interfaz intuitiva, no se requiere capacitación extensa"
]

// Landing page complete
// Last updated: 2025-10-25 20:40 - Deploy fix

