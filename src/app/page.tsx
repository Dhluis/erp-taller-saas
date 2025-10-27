"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Wrench, 
  Users, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle, 
  Database
} from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">EAGLES</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Iniciar Sesión</Button>
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
      <section className="container mx-auto px-4 py-20">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <motion.h1 
            className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            variants={fadeInUp}
          >
            Gestión Integral para tu Taller Automotriz
          </motion.h1>
          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            variants={fadeInUp}
          >
            Optimiza operaciones, aumenta la productividad y lleva tu negocio al siguiente nivel con EAGLES ERP.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={fadeInUp}
          >
            <Link href="/auth/register">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white px-8">
                Probar Gratis - 7 días
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Ver Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Características Principales</h2>
          <p className="text-muted-foreground">Todo lo que necesitas para administrar tu taller</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="p-6 rounded-lg border bg-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">¿Por qué elegir EAGLES?</h2>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                className="flex items-center gap-4 p-4 rounded-lg bg-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                <span className="text-lg">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          className="max-w-3xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-r from-primary to-accent"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para transformar tu taller?
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            Comienza tu prueba gratuita de 7 días. Sin tarjeta de crédito. Cancela cuando quieras.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8">
              Probar Gratis - 7 días
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold">EAGLES</span>
              </div>
              <p className="text-muted-foreground text-sm">
                ERP Taller Automotriz
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Características</a></li>
                <li><a href="#" className="hover:text-primary">Precios</a></li>
                <li><a href="#" className="hover:text-primary">Seguridad</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Nosotros</a></li>
                <li><a href="#" className="hover:text-primary">Contacto</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacidad</a></li>
                <li><a href="#" className="hover:text-primary">Términos</a></li>
                <li><a href="#" className="hover:text-primary">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 EAGLES. Todos los derechos reservados.</p>
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
