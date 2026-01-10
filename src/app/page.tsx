'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cloud, Headphones, Shield, FileText, Package, Users, Receipt,
  BarChart3, Smartphone, Check, Star, TrendingUp, Zap, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/context/SessionContext'

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
  const router = useRouter()
  const session = useSession()
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [checking, setChecking] = useState(true)

  // Redirigir usuarios autenticados al dashboard (patrón consistente con login/page.tsx)
  useEffect(() => {
    // Verificar si viene de callback de OAuth (dar más tiempo para sincronizar cookies)
    const urlParams = new URLSearchParams(window.location.search)
    const isFromOAuthCallback =
      typeof window !== 'undefined' && (
        document.referrer.includes('/auth/callback') ||
        sessionStorage.getItem('oauth_callback') === 'true' ||
        urlParams.has('oauth_callback')
      )

    // Delay adicional si viene de OAuth callback
    const checkDelay = isFromOAuthCallback ? 1500 : 500

    const checkAuth = setTimeout(() => {
      const user = session?.user
      const isReady = session?.isReady
      const isLoading = session?.isLoading

      // Si la sesión está lista y hay usuario, redirigir al dashboard
      if (isReady && !isLoading && user) {
        console.log('[LandingPage] ✅ Usuario autenticado, redirigiendo al dashboard...')
        router.replace('/dashboard')
        return
      }

      // Si la sesión está lista pero no hay usuario, mostrar landing page
      if (isReady && !isLoading) {
        setChecking(false)
      }
    }, checkDelay)

    return () => clearTimeout(checkAuth)
  }, [session, router])

  // Mostrar loading mientras valida autenticación
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <main className="min-h-screen bg-white">
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

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="text-white space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-balance">
                Gestiona tu Taller Mecánico de manera Profesional
              </h1>
              <p className="text-xl lg:text-2xl text-cyan-50 leading-relaxed text-pretty">
                Eagles Sistem es un software completo: órdenes de trabajo, inventario, clientes, facturación y más. Todo en la nube.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="bg-white text-cyan-600 hover:bg-cyan-50 text-lg px-8 py-6 h-auto font-semibold shadow-xl"
                  >
                    Comenzar Gratis - 7 Días
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto font-semibold bg-transparent"
                >
                  Ver Demo
                </Button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="flex flex-col items-center text-center gap-2">
                  <Cloud className="w-8 h-8" />
                  <span className="text-sm font-medium">100% en la nube</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <Headphones className="w-8 h-8" />
                  <span className="text-sm font-medium">Soporte 24/7</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <Shield className="w-8 h-8" />
                  <span className="text-sm font-medium">Datos seguros</span>
                </div>
              </div>
            </div>

            {/* Right content - Dashboard mockup */}
            <div className="relative w-full">
              <div className="relative rounded-2xl overflow-visible shadow-2xl border-4 border-white/20 backdrop-blur-sm bg-white/10 p-2">
                {/* 
                  URL de la imagen desde ImgBB: https://ibb.co/23C3ff0b
                  Para obtener la URL directa:
                  1. Ve a https://ibb.co/23C3ff0b
                  2. Haz clic derecho en la imagen > "Copiar dirección de imagen"
                  3. O busca "Direct links" en la página y copia la URL
                  4. Reemplaza la URL de abajo con la URL directa
                */}
                <div className="relative w-full flex items-center justify-center">
                  <Image
                    src="https://i.ibb.co/ZzFzkkRZ/Captura-de-pantalla-2026-01-05-223640.png"
                    alt="EAGLES ERP Taller Dashboard - Sistema de gestión completo para talleres mecánicos"
                    width={1920}
                    height={1080}
                    className="w-full h-auto rounded-lg object-contain"
                    priority
                    quality={100}
                    unoptimized={true}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg z-10">
                ✓ Fácil de usar
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-2xl font-semibold text-slate-700">Confiado por más de 500 talleres en México</p>
          </div>

          {/* Logo placeholders */}
          <div className="flex flex-wrap justify-center items-center gap-8 mb-16 opacity-60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-slate-400 font-bold text-xl">
                Taller Logo {i}
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, label: "10,000+ Órdenes procesadas", value: "10K+" },
              { icon: Users, label: "500+ Talleres activos", value: "500+" },
              { icon: Zap, label: "99.9% Uptime", value: "99.9%" },
              { icon: Star, label: "4.9★ Satisfacción", value: "4.9★" },
            ].map((stat, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <stat.icon className="w-10 h-10 mx-auto mb-4 text-cyan-600" />
                  <div className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-balance">Todo lo que necesitas en un solo lugar</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "Órdenes de Trabajo Digitales",
                items: ["Control total del flujo de trabajo", "Desde recepción hasta entrega", "Estados en tiempo real"],
              },
              {
                icon: Package,
                title: "Inventario Inteligente",
                items: ["Control de stock automático", "Alertas de bajo inventario", "Movimientos rastreados"],
              },
              {
                icon: Users,
                title: "Gestión de Clientes",
                items: ["Base de datos completa", "Historial de servicios", "Vehículos vinculados"],
              },
              {
                icon: Receipt,
                title: "Facturación CFDI 4.0",
                items: ["Timbrado automático", "Cumplimiento fiscal total", "Reportes financieros"],
              },
              {
                icon: BarChart3,
                title: "Dashboard en Tiempo Real",
                items: ["Métricas instantáneas", "Reportes personalizados", "Análisis de rendimiento"],
              },
              {
                icon: Smartphone,
                title: "App Móvil Incluida",
                items: ["Acceso desde cualquier lugar", "Notificaciones push", "100% responsive"],
              },
            ].map((feature, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <Card className="p-8 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-teal-300">{feature.title}</h3>
                  <ul className="space-y-2 text-slate-300">
                    {feature.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Main screenshot */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <div className="bg-slate-900 p-6">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex gap-2 mb-4">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Todas</Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Últimos 7 días</Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Últimos 30 días</Button>
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
                </div>
              </div>

              {/* Floating annotations */}
              <div className="absolute top-8 left-8 bg-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium">
                📊 Métricas en vivo
              </div>
              <div className="absolute top-1/3 right-8 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium">
                ⚡ Acceso rápido
              </div>
              <div className="absolute bottom-8 left-1/4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium">
                ✓ Interfaz intuitiva
              </div>
            </div>

            <p className="text-center text-xl text-slate-600 mt-8 font-medium">
              Interfaz intuitiva diseñada para mecánicos
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900 text-balance">Cómo funciona</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { number: "1", title: "Regístrate en 2 minutos", description: "Simple onboarding" },
              { number: "2", title: "Configura tu taller", description: "Quick setup wizard" },
              { number: "3", title: "Empieza a trabajar", description: "Immediate productivity" },
            ].map((step, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <div className="relative">
                  <Card className="p-8 text-center hover:shadow-lg transition-shadow h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{step.title}</h3>
                    <p className="text-slate-600">{step.description}</p>
                  </Card>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
                  )}
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-balance">Planes diseñados para tu negocio</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Básico",
                price: "$499",
                period: "MXN/mes",
                features: ["Hasta 3 usuarios", "100 órdenes/mes", "Inventario básico", "Soporte por email", "Dashboard básico"],
                cta: "Probar Gratis",
                popular: false,
              },
              {
                name: "Profesional",
                price: "$999",
                period: "MXN/mes",
                features: [
                  "Usuarios ilimitados",
                  "Órdenes ilimitadas",
                  "Inventario completo",
                  "Facturación CFDI 4.0",
                  "Soporte prioritario 24/7",
                  "Reportes avanzados",
                  "App móvil",
                  "API access",
                ],
                cta: "Comenzar Ahora",
                popular: true,
              },
            ].map((plan, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <Card
                  className={`p-8 relative ${plan.popular
                      ? "bg-white text-slate-900 shadow-2xl scale-105"
                      : "bg-white/10 backdrop-blur-sm border-white/20 text-white"
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold">{plan.price}</span>
                      <span className={plan.popular ? "text-slate-600" : "text-white/80"}>{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? "text-emerald-500" : "text-cyan-300"}`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/auth/register">
                    <Button
                      size="lg"
                      className={`w-full ${plan.popular
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                          : "bg-white text-cyan-600 hover:bg-cyan-50"
                        }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </Card>
              </AnimatedCard>
            ))}
          </div>

          <p className="text-center mt-8 text-cyan-50">
            Todos los planes incluyen 7 días de prueba gratis. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900 text-balance">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Desde que uso ERP Taller, he reducido el papeleo en 90%. Todo está organizado y mis clientes están más contentos.",
                author: "Carlos Méndez",
                business: "Taller Méndez",
                location: "CDMX",
              },
              {
                quote: "La facturación automática me ahorra horas cada semana. El sistema es muy fácil de usar y el soporte es excelente.",
                author: "Ana Rodríguez",
                business: "Auto Service Rodríguez",
                location: "Guadalajara",
              },
              {
                quote: "Mis mecánicos pueden ver las órdenes desde sus celulares. La productividad aumentó un 40% en el primer mes.",
                author: "Miguel Torres",
                business: "Taller Torres & Hijos",
                location: "Monterrey",
              },
            ].map((testimonial, index) => (
              <AnimatedCard key={index} delay={index * 0.1}>
                <Card className="p-8 hover:shadow-lg transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-slate-700 mb-6 leading-relaxed">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{testimonial.author}</div>
                      <div className="text-sm text-slate-600">
                        {testimonial.business}, {testimonial.location}
                      </div>
                    </div>
                  </div>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-slate-900 text-balance">Preguntas Frecuentes</h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "¿Necesito instalar software?",
                  answer: "No, ERP Taller es 100% en la nube. Solo necesitas un navegador web y conexión a internet. Funciona en cualquier dispositivo: computadora, tablet o celular.",
                },
                {
                  question: "¿Mis datos están seguros?",
                  answer: "Absolutamente. Usamos encriptación de nivel bancario, respaldos automáticos diarios, y servidores certificados en México. Tus datos están protegidos 24/7.",
                },
                {
                  question: "¿Puedo cancelar en cualquier momento?",
                  answer: "Sí, no hay contratos ni penalizaciones. Puedes cancelar tu suscripción en cualquier momento desde tu panel de control. Mantendrás acceso hasta el final de tu período pagado.",
                },
                {
                  question: "¿Ofrecen capacitación?",
                  answer: "Sí, incluimos capacitación gratuita para tu equipo. Además, tenemos videos tutoriales, documentación completa y soporte en vivo para ayudarte en todo momento.",
                },
                {
                  question: "¿Funciona sin internet?",
                  answer: "ERP Taller requiere conexión a internet para funcionar. Sin embargo, la app móvil puede guardar datos temporalmente y sincronizarlos cuando recuperes la conexión.",
                },
                {
                  question: "¿Incluye facturación electrónica?",
                  answer: "Sí, el plan Profesional incluye facturación CFDI 4.0 totalmente integrada con timbrado automático. Cumple con todos los requisitos del SAT.",
                },
              ].map((faq, index) => (
                <Card key={index} className="bg-white rounded-lg px-6 border border-slate-200">
                  <CardContent className="p-4">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-semibold text-slate-900">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform ${openFAQ === index ? 'transform rotate-180' : ''
                          }`}
                      />
                    </button>
                    {openFAQ === index && (
                      <div className="mt-4 text-slate-600 leading-relaxed">{faq.answer}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-balance">¿Listo para modernizar tu taller?</h2>
            <p className="text-xl text-slate-300 text-pretty">Únete a cientos de talleres que ya confían en nosotros</p>
            <div>
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-xl px-12 py-8 h-auto font-bold shadow-2xl"
                >
                  Comenzar Gratis - 7 Días
                </Button>
              </Link>
              <p className="text-sm text-slate-400 mt-4">No se requiere tarjeta de crédito</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div>
              <h3 className="text-white font-bold text-xl mb-4">ERP Taller SaaS</h3>
              <p className="text-sm leading-relaxed">
                La solución completa para gestionar tu taller mecánico de manera profesional.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2">
                {['Características', 'Precios', 'Demo'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="hover:text-cyan-400 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2">
                {['Sobre nosotros', 'Blog', 'Contacto'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="hover:text-cyan-400 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacidad', 'Términos', 'CFDI'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="hover:text-cyan-400 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom section */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 Eagles Sistems. Hecho en México.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
