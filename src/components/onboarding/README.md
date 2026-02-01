# 🎯 Sistema de Onboarding - Tour Guiado

## 📋 Descripción

Sistema completo de onboarding que muestra un tour guiado interactivo la primera vez que un usuario entra a la plataforma.

## 🚀 Características

- ✅ **Detección automática**: Detecta si es la primera vez que el usuario entra
- ✅ **Tour interactivo**: Recorrido guiado con instrucciones claras
- ✅ **Colores consistentes**: Usa los colores del tema (primary: #00D9FF)
- ✅ **Toast de bienvenida**: Notificación de bienvenida al iniciar
- ✅ **Persistencia**: Guarda en localStorage que el tour fue completado
- ✅ **Omitible**: El usuario puede saltar el tour en cualquier momento

## 📦 Componentes

### `OnboardingTour`
Componente principal que renderiza el tour usando `react-joyride`.

**Ubicación:** `src/components/onboarding/OnboardingTour.tsx`

**Props:**
- `run?: boolean` - Control externo del tour
- `onComplete?: () => void` - Callback cuando se completa

### `useOnboardingTour`
Hook para manejar el estado del tour.

**Ubicación:** `src/hooks/useOnboardingTour.ts`

**Retorna:**
- `isFirstTime: boolean` - Si es la primera vez
- `isTourActive: boolean` - Si el tour está activo
- `startTour()` - Iniciar el tour
- `stopTour()` - Detener y marcar como completado
- `skipTour()` - Saltar y marcar como completado
- `resetTour()` - Reiniciar el tour (útil para testing)

## 🎨 Pasos del Tour

El tour incluye los siguientes pasos:

1. **Dashboard** - Introducción y bienvenida
2. **Sidebar** - Navegación principal
3. **Acciones Rápidas** - Crear órdenes rápidamente
4. **Métricas** - Estadísticas del negocio
5. **Notificaciones** - Sistema de alertas
6. **Perfil** - Configuración de usuario

## 🔧 Integración

### 1. Agregar atributos `data-tour` a los elementos

Para que el tour funcione, los elementos deben tener el atributo `data-tour`:

```tsx
// Dashboard principal
<div data-tour="dashboard">
  {/* Contenido */}
</div>

// Sidebar
<aside data-tour="sidebar">
  {/* Navegación */}
</aside>

// Acciones rápidas
<Card data-tour="quick-actions">
  {/* Acciones */}
</Card>

// Estadísticas
<div data-tour="stats">
  {/* Stats */}
</div>

// Notificaciones
<button data-tour="notifications">
  {/* Bell icon */}
</button>

// Perfil
<button data-tour="profile">
  {/* Profile */}
</button>
```

### 2. Integrar en el Layout

El tour ya está integrado en `src/app/(dashboard)/layout.tsx`:

```tsx
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

export default function DashboardLayout({ children }) {
  return (
    <>
      <AppLayout>
        {children}
      </AppLayout>
      <OnboardingTour />
    </>
  )
}
```

## 🎨 Personalización

### Cambiar los pasos del tour

Edita `TOUR_STEPS` en `src/components/onboarding/OnboardingTour.tsx`:

```tsx
const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: (
      <div>
        <h3>Tu título</h3>
        <p>Tu descripción</p>
      </div>
    ),
    placement: 'bottom',
  },
  // ... más pasos
]
```

### Cambiar los colores

Edita `TOUR_STYLES` en el mismo archivo:

```tsx
const TOUR_STYLES: Styles = {
  options: {
    primaryColor: '#00D9FF', // Color primary del tema
  },
  tooltip: {
    backgroundColor: '#151923', // bg-secondary
    border: '1px solid #00D9FF', // primary border
  },
  // ... más estilos
}
```

## 🧪 Testing

### Reiniciar el tour para testing

```tsx
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

function TestComponent() {
  const { resetTour } = useOnboardingTour()
  
  return (
    <button onClick={resetTour}>
      Reiniciar Tour
    </button>
  )
}
```

### Verificar estado

```tsx
const { isFirstTime, isTourActive } = useOnboardingTour()
console.log('Es primera vez:', isFirstTime)
console.log('Tour activo:', isTourActive)
```

## 📝 Notas

- El tour se guarda en `localStorage` con la clave `eagles_erp_onboarding_completed`
- Si cambias los pasos del tour, incrementa `ONBOARDING_VERSION` en `useOnboardingTour.ts`
- El tour solo se muestra en rutas del dashboard (no en auth, etc.)
- Si no hay elementos con `data-tour`, el tour no se muestra
