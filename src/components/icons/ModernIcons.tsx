/**
 * Iconos Modernos - Estilo Flat/Colorido
 * Diseño consistente para todo el sistema
 */

interface IconProps {
  className?: string
  size?: number
}

// Dashboard / Home
export const DashboardIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="4" y="4" width="40" height="40" rx="4" fill="#3B82F6"/>
    <rect x="8" y="8" width="32" height="6" rx="2" fill="#60A5FA"/>
    <rect x="8" y="18" width="14" height="22" rx="2" fill="#93C5FD"/>
    <rect x="26" y="18" width="14" height="10" rx="2" fill="#DBEAFE"/>
    <rect x="26" y="30" width="14" height="10" rx="2" fill="#DBEAFE"/>
  </svg>
)

// WhatsApp / Mensajería
export const WhatsAppIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#25D366"/>
    <path d="M12 36L14 28C12 25 11 22 12 18C13 14 17 10 22 9C27 8 32 10 35 14C38 18 38 23 36 27C34 31 29 35 24 35C22 35 20 34 18 33L12 36Z" fill="white"/>
    <path d="M20 20H28M20 24H26M20 28H24" stroke="#25D366" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// Bot / AI
export const BotIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="10" y="16" width="28" height="24" rx="4" fill="#8B5CF6"/>
    <rect x="12" y="8" width="24" height="10" rx="2" fill="#A78BFA"/>
    <circle cx="20" cy="26" r="3" fill="#EDE9FE"/>
    <circle cx="28" cy="26" r="3" fill="#EDE9FE"/>
    <path d="M18 32H30" stroke="#EDE9FE" strokeWidth="2" strokeLinecap="round"/>
    <rect x="22" y="4" width="4" height="6" rx="1" fill="#C4B5FD"/>
  </svg>
)

// Clientes / Usuarios
export const ClientesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="16" r="8" fill="#EC4899"/>
    <path d="M10 38C10 30 16 26 24 26C32 26 38 30 38 38" fill="#F472B6"/>
    <circle cx="24" cy="16" r="6" fill="#FBE2F0"/>
  </svg>
)

// Órdenes / Documentos
export const OrdenesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="8" y="4" width="32" height="40" rx="3" fill="#F59E0B"/>
    <rect x="12" y="10" width="24" height="4" rx="1" fill="#FCD34D"/>
    <rect x="12" y="18" width="20" height="3" rx="1" fill="#FEF3C7"/>
    <rect x="12" y="24" width="16" height="3" rx="1" fill="#FEF3C7"/>
    <rect x="12" y="30" width="18" height="3" rx="1" fill="#FEF3C7"/>
  </svg>
)

// Citas / Calendario
export const CitasIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="6" y="10" width="36" height="32" rx="3" fill="#10B981"/>
    <rect x="6" y="10" width="36" height="8" rx="3" fill="#34D399" rx-br="0" rx-bl="0"/>
    <rect x="14" y="6" width="4" height="8" rx="1" fill="#6EE7B7"/>
    <rect x="30" y="6" width="4" height="8" rx="1" fill="#6EE7B7"/>
    <circle cx="16" cy="26" r="2" fill="#D1FAE5"/>
    <circle cx="24" cy="26" r="2" fill="#D1FAE5"/>
    <circle cx="32" cy="26" r="2" fill="#D1FAE5"/>
    <circle cx="16" cy="34" r="2" fill="#D1FAE5"/>
    <circle cx="24" cy="34" r="2" fill="#D1FAE5"/>
  </svg>
)

// Vehículos / Autos
export const VehiculosIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M8 28H40L38 18H10L8 28Z" fill="#EF4444"/>
    <rect x="6" y="28" width="36" height="8" rx="2" fill="#F87171"/>
    <circle cx="14" cy="36" r="4" fill="#1F2937"/>
    <circle cx="14" cy="36" r="2" fill="#9CA3AF"/>
    <circle cx="34" cy="36" r="4" fill="#1F2937"/>
    <circle cx="34" cy="36" r="2" fill="#9CA3AF"/>
    <path d="M10 18L14 12H34L38 18" stroke="#DC2626" strokeWidth="2"/>
  </svg>
)

// Inventarios / Almacén (cajas apiladas)
export const InventariosIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="8" y="12" width="32" height="32" rx="2" fill="#06B6D4"/>
    <path d="M8 20H40" stroke="#67E8F9" strokeWidth="2"/>
    <path d="M8 28H40" stroke="#67E8F9" strokeWidth="2"/>
    <path d="M8 36H40" stroke="#67E8F9" strokeWidth="2"/>
    <path d="M20 12V44" stroke="#67E8F9" strokeWidth="2"/>
    <rect x="10" y="14" width="8" height="4" rx="1" fill="#CFFAFE"/>
  </svg>
)

// Productos / Artículos (etiqueta de precio)
export const ProductosIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M12 10L20 6L36 12V38L20 44L12 40V10Z" fill="#0EA5E9"/>
    <circle cx="20" cy="18" r="5" fill="#38BDF8"/>
    <path d="M20 23V32M16 28H24" stroke="#E0F2FE" strokeWidth="2" strokeLinecap="round"/>
    <rect x="24" y="20" width="8" height="12" rx="1" fill="#7DD3FC"/>
  </svg>
)

// Categorías / Grupos (grid)
export const CategoriasIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="6" y="6" width="16" height="16" rx="2" fill="#0284C7"/>
    <rect x="26" y="6" width="16" height="16" rx="2" fill="#0EA5E9"/>
    <rect x="6" y="26" width="16" height="16" rx="2" fill="#38BDF8"/>
    <rect x="26" y="26" width="16" height="16" rx="2" fill="#7DD3FC"/>
  </svg>
)

// Reportes / Gráficas
export const ReportesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="4" y="4" width="40" height="40" rx="3" fill="#8B5CF6"/>
    <rect x="10" y="30" width="6" height="10" rx="1" fill="#C4B5FD"/>
    <rect x="18" y="24" width="6" height="16" rx="1" fill="#C4B5FD"/>
    <rect x="26" y="18" width="6" height="22" rx="1" fill="#C4B5FD"/>
    <rect x="34" y="14" width="6" height="26" rx="1" fill="#C4B5FD"/>
  </svg>
)

// Configuraciones / Ajustes
export const ConfiguracionIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#6366F1"/>
    <circle cx="24" cy="24" r="8" fill="#C7D2FE"/>
    <rect x="22" y="4" width="4" height="10" rx="2" fill="#818CF8"/>
    <rect x="22" y="34" width="4" height="10" rx="2" fill="#818CF8"/>
    <rect x="4" y="22" width="10" height="4" rx="2" fill="#818CF8"/>
    <rect x="34" y="22" width="10" height="4" rx="2" fill="#818CF8"/>
  </svg>
)

// Entrenamiento / Sparkles
export const EntrenamientoIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M24 4L26 14L34 8L28 16L38 18L28 20L34 28L26 22L24 32L22 22L14 28L20 20L10 18L20 16L14 8L22 14L24 4Z" fill="#FBBF24"/>
    <circle cx="24" cy="18" r="6" fill="#FDE68A"/>
    <path d="M18 34L24 28L30 34" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Testing / Play
export const TestingIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#10B981"/>
    <path d="M18 14L34 24L18 34V14Z" fill="#D1FAE5"/>
  </svg>
)

// Conversaciones / Chat
export const ConversacionesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="4" y="8" width="32" height="24" rx="4" fill="#3B82F6"/>
    <path d="M4 32L10 26H4V32Z" fill="#3B82F6"/>
    <rect x="8" y="14" width="20" height="3" rx="1" fill="#DBEAFE"/>
    <rect x="8" y="20" width="16" height="3" rx="1" fill="#DBEAFE"/>
    <rect x="8" y="26" width="12" height="3" rx="1" fill="#DBEAFE"/>
  </svg>
)

// Finanzas / Dinero
export const FinanzasIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#10B981"/>
    <text x="24" y="32" fontSize="24" fontWeight="bold" textAnchor="middle" fill="#D1FAE5">$</text>
  </svg>
)

// Mecánicos / Herramientas
export const MecanicosIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="8" y="8" width="32" height="32" rx="4" fill="#F59E0B"/>
    <path d="M18 18L24 24M24 24L30 18M24 24V34" stroke="#FEF3C7" strokeWidth="3" strokeLinecap="round"/>
    <rect x="14" y="14" width="8" height="8" rx="2" fill="#FCD34D"/>
  </svg>
)

// Notificaciones / Campana
export const NotificacionesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M24 6C24 6 18 10 18 18V28L14 34H34L30 28V18C30 10 24 6 24 6Z" fill="#EF4444"/>
    <path d="M20 34C20 37 22 39 24 39C26 39 28 37 28 34" stroke="#FCA5A5" strokeWidth="2"/>
    <circle cx="32" cy="12" r="4" fill="#DC2626"/>
  </svg>
)

// Cotizaciones / Documento con $
export const CotizacionesIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="8" y="4" width="32" height="40" rx="3" fill="#8B5CF6"/>
    <circle cx="24" cy="20" r="8" fill="#EDE9FE"/>
    <text x="24" y="26" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#8B5CF6">$</text>
    <rect x="12" y="32" width="24" height="3" rx="1" fill="#C4B5FD"/>
    <rect x="12" y="38" width="16" height="2" rx="1" fill="#C4B5FD"/>
  </svg>
)

// Pagos / Tarjeta
export const PagosIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="4" y="12" width="40" height="24" rx="4" fill="#EC4899"/>
    <rect x="4" y="18" width="40" height="6" fill="#BE185D"/>
    <rect x="8" y="28" width="16" height="4" rx="1" fill="#FBCFE8"/>
  </svg>
)

// Check / Success
export const CheckIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#10B981"/>
    <path d="M14 24L20 30L34 16" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Error / X
export const ErrorIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#EF4444"/>
    <path d="M16 16L32 32M32 16L16 32" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
)

// Warning / Alerta
export const WarningIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M24 4L44 40H4L24 4Z" fill="#F59E0B"/>
    <path d="M24 16V26" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="24" cy="32" r="2" fill="white"/>
  </svg>
)

// Perfil / Usuario
export const PerfilIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="20" fill="#6366F1"/>
    <circle cx="24" cy="18" r="7" fill="#E0E7FF"/>
    <path d="M8 38C8 30 15 26 24 26C33 26 40 30 40 38" fill="#E0E7FF"/>
  </svg>
)

// Search / Buscar
export const SearchIcon = ({ className = '', size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="20" cy="20" r="14" fill="#3B82F6"/>
    <circle cx="20" cy="20" r="10" fill="#DBEAFE"/>
    <path d="M30 30L42 42" stroke="#1E40AF" strokeWidth="4" strokeLinecap="round"/>
  </svg>
)

export default {
  Dashboard: DashboardIcon,
  WhatsApp: WhatsAppIcon,
  Bot: BotIcon,
  Clientes: ClientesIcon,
  Ordenes: OrdenesIcon,
  Citas: CitasIcon,
  Vehiculos: VehiculosIcon,
  Inventarios: InventariosIcon,
  Productos: ProductosIcon,
  Categorias: CategoriasIcon,
  Reportes: ReportesIcon,
  Configuracion: ConfiguracionIcon,
  Entrenamiento: EntrenamientoIcon,
  Testing: TestingIcon,
  Conversaciones: ConversacionesIcon,
  Finanzas: FinanzasIcon,
  Mecanicos: MecanicosIcon,
  Notificaciones: NotificacionesIcon,
  Cotizaciones: CotizacionesIcon,
  Pagos: PagosIcon,
  Check: CheckIcon,
  Error: ErrorIcon,
  Warning: WarningIcon,
  Perfil: PerfilIcon,
  Search: SearchIcon,
}

