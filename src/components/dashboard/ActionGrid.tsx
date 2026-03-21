'use client'

import { motion } from 'framer-motion'
import { 
  Plus, 
  FileText, 
  ClipboardList, 
  Store, 
  Calendar as CalendarIcon, 
  Laptop, 
  Users, 
  ShoppingBag, 
  Wrench,
  ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ActionItem {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  href?: string
  onClick?: () => void
  isCalendar?: boolean
  date?: {
    month: string
    day: string
  }
}

interface ActionGridProps {
  onNewOrder?: () => void
  className?: string
}

export function ActionGrid({ onNewOrder, className }: ActionGridProps) {
  const router = useRouter()

  const actions: ActionItem[] = [
    {
      id: 'crear',
      label: 'Crear',
      icon: <Plus className="w-10 h-10 text-blue-500 stroke-[3px]" />,
      color: 'bg-white',
      onClick: onNewOrder
    },
    {
      id: 'presupuestos',
      label: 'Presupuestos',
      icon: <FileText className="w-10 h-10 text-white" />,
      color: 'bg-[#FACC15]', // Yellow
      href: '/cotizaciones'
    },
    {
      id: 'ordenes',
      label: 'Ordenes',
      icon: <ClipboardList className="w-10 h-10 text-white" />,
      color: 'bg-[#F43F5E]', // Rose
      href: '/ordenes'
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: <Store className="w-10 h-10 text-white" />,
      color: 'bg-[#3B82F6]', // Blue
      href: '/comercial'
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: null,
      color: 'bg-white',
      isCalendar: true,
      date: {
        month: 'DIC',
        day: '18'
      },
      href: '/citas'
    },
    {
      id: 'equipos',
      label: 'Equipos',
      icon: <Laptop className="w-10 h-10 text-white" />,
      color: 'bg-[#F97316]', // Orange
      href: '/vehiculos'
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: <Users className="w-10 h-10 text-white" />,
      color: 'bg-[#22C55E]', // Green
      href: '/clientes'
    },
    {
      id: 'productos',
      label: 'Productos',
      icon: <ShoppingBag className="w-10 h-10 text-white" />,
      color: 'bg-[#D946EF]', // Fuchsia
      href: '/productos'
    },
    {
      id: 'servicios',
      label: 'Servicios',
      icon: <Wrench className="w-10 h-10 text-white" />,
      color: 'bg-[#0EA5E9]', // Sky
      href: '/service-packages'
    }
  ]

  const handleAction = (action: ActionItem) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      router.push(action.href)
    }
  }

  return (
    <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", className)}>
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 justify-items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            className="flex flex-col items-center space-y-3 cursor-pointer group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction(action)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className={cn(
              "w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-xl",
              action.color,
              action.id === 'crear' && "border-2 border-slate-100",
              action.isCalendar && "flex-col p-0"
            )}>
              {/* Glassmorphism subtle overlay */}
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
              
              {action.isCalendar ? (
                <div className="w-full h-full flex flex-col">
                  <div className="bg-rose-500 w-full py-1 text-center">
                    <span className="text-[10px] font-bold text-white tracking-widest">{action.date?.month}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800">{action.date?.day}</span>
                  </div>
                </div>
              ) : (
                action.icon
              )}
            </div>
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
              {action.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Pagination dots (like in the image) */}
      <div className="flex justify-center mt-10 space-x-2">
        <div className="w-2 h-2 rounded-full bg-white opacity-100" />
        <div className="w-2 h-2 rounded-full bg-white opacity-30" />
      </div>
    </div>
  )
}
