'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, CheckCircle, Star, Users, Wrench, BarChart3, Shield, Zap, Clock, Database, FileText, Package, Smartphone, Cloud, Headphones, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

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
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/eagles-logo-new.png"
              alt="EAGLES SYSTEM"
              width={120}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Probar Gratis - 7 días
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <section className="py-12 px-4 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Gestiona tu Taller Mecánico como un Profesional
              </h1>
              <p className="text-lg md:text-xl mb-8 text-blue-50">
                Sistema ERP completo: órdenes de trabajo, inventario, clientes, facturación y más. Todo en la nube.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
                    Comenzar Gratis - 7 Días
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8">
                  Ver Demo
                </Button>
              </div>
              {/* Feature Icons */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  <span className="text-sm">100% en la nube</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  <span className="text-sm">Soporte 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">Datos seguros</span>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Dashboard Screenshot Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-slate-900 rounded-lg shadow-2xl p-4 border border-slate-700">
                <div className="bg-slate-800 rounded p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">EAGLES - ERP Taller SaaS</h3>
                    <Badge className="bg-green-500 text-white">
                      <Check className="w-3 h-3 mr-1" />
                      Fácil de usar
                    </Badge>
                  </div>
                  <div className="text-slate-400 text-sm mb-4">
                    Dashboard en tiempo real con métricas y órdenes de trabajo
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="h-20 bg-slate-600/50 rounded mb-2"></div>
                      <div className="h-3 bg-slate-600/50 rounded w-3/4"></div>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <div className="h-20 bg-slate-600/50 rounded mb-2"></div>
                      <div className="h-3 bg-slate-600/50 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - "Todo lo que necesitas en un solo lugar" */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Órdenes de Trabajo Digitales */}
            <AnimatedCard delay={0.1}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <FileText className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">Órdenes de Trabajo Digitales</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Control total del flujo de trabajo</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Desde recepción hasta entrega</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Estados en tiempo real</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Feature 2: Inventario Inteligente */}
            <AnimatedCard delay={0.2}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <Package className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">Inventario Inteligente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Control de stock automático</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Alertas de bajo inventario</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Movimientos rastreados</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Feature 3: Gestión de Clientes */}
            <AnimatedCard delay={0.3}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <Users className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">Gestión de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Base de datos completa</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Historial de servicios</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Vehículos vinculados</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Feature 4: Facturación CFDI 4.0 */}
            <AnimatedCard delay={0.4}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <FileText className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">Facturación CFDI 4.0</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Timbrado automático</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Cumplimiento fiscal total</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Reportes financieros</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Feature 5: Dashboard en Tiempo Real */}
            <AnimatedCard delay={0.5}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <BarChart3 className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">Dashboard en Tiempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Métricas instantáneas</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Reportes personalizados</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Análisis de rendimiento</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Feature 6: App Móvil Incluida */}
            <AnimatedCard delay={0.6}>
              <Card className="bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <Smartphone className="w-12 h-12 text-blue-500 mb-4" />
                  <CardTitle className="text-blue-700">App Móvil Incluida</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Acceso desde cualquier lugar</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Notificaciones push</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>100% responsive</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Dashboard/Kanban Showcase Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Interfaz intuitiva diseñada para mecánicos
            </h2>
          </motion.div>
          
          <div className="bg-slate-900 rounded-xl p-6 shadow-2xl">
            <div className="bg-slate-800 rounded-lg p-4 mb-4">
              <div className="flex gap-2 mb-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Todas</Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Últimos 7 días</Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Últimos 30 días</Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Este mes</Button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {['Métricas en vivo', 'Esperando Piezas', 'Armado', 'Pruebas', 'Listo'].map((col, idx) => (
                  <div key={idx} className="bg-slate-700/50 rounded p-3">
                    <div className="text-white text-sm font-semibold mb-2">{col}</div>
                    <div className="space-y-2">
                      <div className="bg-slate-600/50 rounded p-2 text-xs text-gray-300">
                        <div className="h-16 bg-slate-500/50 rounded mb-1"></div>
                        <div className="h-2 bg-slate-500/50 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                <Check className="w-4 h-4 mr-2" />
                Interfaz intuitiva
              </Button>
              <p className="text-gray-400 text-sm mt-2">Interfaz intuitiva diseñada para mecánicos</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-blue-600 mb-12">
              Cómo funciona
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { num: 1, title: 'Regístrate en 2 minutos', subtitle: 'Simple onboarding' },
              { num: 2, title: 'Configura tu taller', subtitle: 'Quick setup wizard' },
              { num: 3, title: 'Empieza a trabajar', subtitle: 'Immediate productivity' }
            ].map((step, idx) => (
              <AnimatedCard key={idx} delay={idx * 0.1}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.subtitle}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Planes diseñados para tu negocio
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Básico Plan */}
            <AnimatedCard delay={0.1}>
              <Card className="bg-blue-100/80 border-blue-300 h-full">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-blue-900">Básico</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-blue-900">$499</span>
                    <span className="text-blue-700 ml-2">MXN/mes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-blue-900">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span>Hasta 3 usuarios</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span>100 órdenes/mes</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span>Inventario básico</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span>Soporte por email</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span>Dashboard básico</span>
                    </li>
                  </ul>
                  <Link href="/auth/register">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Probar Gratis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Profesional Plan */}
            <AnimatedCard delay={0.2}>
              <Card className="bg-white border-2 border-blue-500 h-full relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-4 py-1">POPULAR</Badge>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900">Profesional</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">$999</span>
                    <span className="text-gray-700 ml-2">MXN/mes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Usuarios ilimitados</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Órdenes ilimitadas</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Inventario completo</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Facturación CFDI 4.0</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Soporte prioritario 24/7</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>Reportes avanzados</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>App móvil</span>
                    </li>
                    <li className="flex items-center text-gray-900">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span>API access</span>
                    </li>
                  </ul>
                  <Link href="/auth/register">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white">
                      Comenzar Ahora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>

          <p className="text-center text-white mt-8 text-sm">
            Todos los planes incluyen 7 días de prueba gratis. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Carlos Méndez',
                business: 'Taller Méndez, CDMX',
                text: 'Desde que uso ERP Taller, he reducido el papeleo en 90%. Todo está organizado y mis clientes están más contentos.',
                initial: 'C'
              },
              {
                name: 'Ana Rodríguez',
                business: 'Auto Service Rodríguez, Guadalajara',
                text: 'La facturación automática me ahorra horas cada semana. El sistema es muy fácil de usar y el soporte es excelente.',
                initial: 'A'
              },
              {
                name: 'Miguel Torres',
                business: 'Taller Torres & Hijos, Monterrey',
                text: 'Mis mecánicos pueden ver las órdenes desde sus celulares. La productividad aumentó un 40% en el primer mes.',
                initial: 'M'
              }
            ].map((testimonial, idx) => (
              <AnimatedCard key={idx} delay={idx * 0.1}>
                <Card className="border-gray-200 h-full">
                  <CardContent className="pt-6">
                    <div className="flex mb-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6">{testimonial.text}</p>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold">{testimonial.initial}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-600">{testimonial.business}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Preguntas Frecuentes
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              '¿Necesito instalar software?',
              '¿Mis datos están seguros?',
              '¿Puedo cancelar en cualquier momento?',
              '¿Ofrecen capacitación?',
              '¿Funciona sin internet?',
              '¿Incluye facturación electrónica?'
            ].map((question, idx) => (
              <Card key={idx} className="border-gray-200">
                <CardContent className="p-4">
                  <button
                    onClick={() => toggleFAQ(idx)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="font-semibold text-gray-900">{question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        openFAQ === idx ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFAQ === idx && (
                    <div className="mt-4 text-gray-600">
                      <p>
                        {idx === 0 && 'No, nuestro sistema es 100% en la nube. Solo necesitas un navegador web.'}
                        {idx === 1 && 'Sí, utilizamos encriptación de nivel empresarial y respaldos automáticos diarios.'}
                        {idx === 2 && 'Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones.'}
                        {idx === 3 && 'Sí, ofrecemos capacitación gratuita y soporte continuo para todos nuestros clientes.'}
                        {idx === 4 && 'No, requiere conexión a internet para funcionar, ya que es una plataforma en la nube.'}
                        {idx === 5 && 'Sí, el plan Profesional incluye facturación electrónica CFDI 4.0 con timbrado automático.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              ¿Listo para modernizar tu taller?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Únete a cientos de talleres que ya confían en nosotros
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 text-lg">
                Comenzar Gratis - 7 Días
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/eagles-logo-new.png"
                alt="EAGLES SYSTEM"
                width={120}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <div className="text-gray-600 text-sm">
              © 2024 ERP Taller. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
