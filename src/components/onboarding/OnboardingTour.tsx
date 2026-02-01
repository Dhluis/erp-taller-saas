/**
 * Componente de Tour Guiado para Onboarding
 * Muestra un recorrido interactivo de la plataforma con instrucciones claras
 */

'use client'

import { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride'
import { useOnboardingTour } from './useOnboardingTour'
import { toast } from 'sonner'
import { Sparkles, X } from 'lucide-react'

interface OnboardingTourProps {
  run?: boolean
  onComplete?: () => void
}

// Pasos del tour con colores consistentes del tema
const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">¡Bienvenido a Eagles ERP! 🎉</h3>
        <p className="text-sm text-gray-300">
          Este es tu <strong className="text-primary">Dashboard</strong>, aquí verás un resumen de tu negocio.
        </p>
        <p className="text-xs text-gray-400">
          Podrás ver estadísticas, órdenes recientes y acciones rápidas.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Navegación Principal 📋</h3>
        <p className="text-sm text-gray-300">
          Usa el <strong className="text-primary">menú lateral</strong> para acceder a todas las secciones:
        </p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Órdenes de Trabajo</li>
          <li>Clientes y Vehículos</li>
          <li>Inventario</li>
          <li>Reportes y más</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="quick-actions"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Acciones Rápidas ⚡</h3>
        <p className="text-sm text-gray-300">
          Desde aquí puedes <strong className="text-primary">crear órdenes</strong> rápidamente.
        </p>
        <p className="text-xs text-gray-400">
          Haz clic en "Nueva Orden" para comenzar a trabajar con tus clientes.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="stats"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Métricas en Tiempo Real 📊</h3>
        <p className="text-sm text-gray-300">
          Aquí verás las <strong className="text-primary">estadísticas</strong> de tu taller:
        </p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Órdenes activas</li>
          <li>Ingresos del mes</li>
          <li>Clientes totales</li>
          <li>Y más métricas importantes</li>
        </ul>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="notifications"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Notificaciones 🔔</h3>
        <p className="text-sm text-gray-300">
          Mantente al día con las <strong className="text-primary">notificaciones</strong> importantes.
        </p>
        <p className="text-xs text-gray-400">
          Recibirás alertas sobre órdenes, inventario y más.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="profile"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Tu Perfil 👤</h3>
        <p className="text-sm text-gray-300">
          Accede a tu <strong className="text-primary">perfil y configuraciones</strong> desde aquí.
        </p>
        <p className="text-xs text-gray-400">
          Puedes cambiar tu información, ajustar preferencias y más.
        </p>
      </div>
    ),
    placement: 'left',
  },
]

// Estilos personalizados consistentes con el tema
const TOUR_STYLES: Styles = {
  options: {
    primaryColor: '#00D9FF', // Color primary del tema
    zIndex: 10000,
    arrowColor: '#151923', // bg-secondary
  },
  tooltip: {
    backgroundColor: '#151923', // bg-secondary
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #00D9FF', // primary border
    boxShadow: '0 10px 40px rgba(0, 217, 255, 0.2)',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    color: '#FFFFFF', // text-primary
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  tooltipContent: {
    color: '#9CA3AF', // text-secondary
    fontSize: '14px',
    padding: '0',
  },
  buttonNext: {
    backgroundColor: '#00D9FF', // primary
    color: '#0A0E1A', // bg-primary (texto oscuro sobre botón claro)
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonBack: {
    color: '#9CA3AF', // text-secondary
    fontSize: '14px',
    marginRight: '10px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #2D3748', // border
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  buttonSkip: {
    color: '#6B7280', // text-muted
    fontSize: '14px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  overlay: {
    backgroundColor: 'rgba(10, 14, 26, 0.85)', // bg-primary con opacidad
  },
  spotlight: {
    borderRadius: '12px',
  },
  beacon: {
    inner: {
      backgroundColor: '#00D9FF', // primary
      border: '2px solid #00D9FF',
    },
    outer: {
      border: '2px solid #00D9FF',
      backgroundColor: 'rgba(0, 217, 255, 0.2)',
    },
  },
}

export function OnboardingTour({ run: externalRun, onComplete }: OnboardingTourProps) {
  const { isTourActive, stopTour, skipTour } = useOnboardingTour()
  const [run, setRun] = useState(externalRun ?? isTourActive)
  const [stepIndex, setStepIndex] = useState(0)

  // Sincronizar con prop externo si se proporciona
  useEffect(() => {
    if (externalRun !== undefined) {
      setRun(externalRun)
    }
  }, [externalRun])

  // ✅ FIX: Sincronizar con isTourActive del hook cuando cambia
  useEffect(() => {
    if (externalRun === undefined) {
      // Solo sincronizar si no hay control externo
      setRun(isTourActive)
    }
  }, [isTourActive, externalRun])

  // Mostrar toast de bienvenida cuando inicia el tour
  useEffect(() => {
    if (run && stepIndex === 0) {
      toast.success('¡Bienvenido a Eagles ERP!', {
        description: 'Te guiaremos en un recorrido rápido por la plataforma',
        duration: 5000,
        icon: <Sparkles className="w-5 h-5" />,
      })
    }
  }, [run, stepIndex])

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false)
      stopTour()
      
      if (status === STATUS.FINISHED) {
        toast.success('¡Tour completado! 🎉', {
          description: 'Ya conoces lo básico. ¡Explora la plataforma!',
          duration: 4000,
        })
      }

      if (onComplete) {
        onComplete()
      }
    } else if (type === 'step:after' || type === 'target:not_found') {
      // Actualizar índice del paso
      setStepIndex(data.index)
    }
  }

  // Si no hay elementos del tour en la página, no mostrar el tour
  if (typeof window === 'undefined') return null

  const hasTourElements = document.querySelectorAll('[data-tour]').length > 0

  if (!hasTourElements && run) {
    // Si no hay elementos pero el tour está activo, esperar un poco
    setTimeout(() => {
      const stillNoElements = document.querySelectorAll('[data-tour]').length === 0
      if (stillNoElements) {
        setRun(false)
        skipTour()
      }
    }, 2000)
    return null
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={TOUR_STYLES}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Omitir tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  )
}
