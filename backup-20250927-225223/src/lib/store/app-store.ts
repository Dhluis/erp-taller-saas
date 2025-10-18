/**
 * Store de Estado Global de la Aplicación
 * Manejo centralizado de estado con Zustand
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Tipos de estado
interface AppState {
  // Configuración
  config: {
    isConfigured: boolean
    environment: string
    version: string
  }
  
  // Autenticación
  auth: {
    user: any | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
  }
  
  // UI
  ui: {
    sidebarOpen: boolean
    theme: 'light' | 'dark'
    loading: boolean
    notifications: Notification[]
  }
  
  // Datos de la aplicación
  data: {
    collections: {
      items: any[]
      stats: any | null
      isLoading: boolean
      error: string | null
      lastUpdated: string | null
    }
    suppliers: {
      items: any[]
      stats: any | null
      isLoading: boolean
      error: string | null
      lastUpdated: string | null
    }
    invoices: {
      items: any[]
      stats: any | null
      isLoading: boolean
      error: string | null
      lastUpdated: string | null
    }
  }
  
  // Cache
  cache: {
    [key: string]: {
      data: any
      timestamp: number
      ttl: number
    }
  }
}

// Tipos de acciones
interface AppActions {
  // Configuración
  setConfig: (config: Partial<AppState['config']>) => void
  
  // Autenticación
  setUser: (user: any | null) => void
  setAuthLoading: (loading: boolean) => void
  setAuthError: (error: string | null) => void
  
  // UI
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLoading: (loading: boolean) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Datos
  setCollections: (collections: any[]) => void
  setCollectionsStats: (stats: any) => void
  setCollectionsLoading: (loading: boolean) => void
  setCollectionsError: (error: string | null) => void
  
  setSuppliers: (suppliers: any[]) => void
  setSuppliersStats: (stats: any) => void
  setSuppliersLoading: (loading: boolean) => void
  setSuppliersError: (error: string | null) => void
  
  setInvoices: (invoices: any[]) => void
  setInvoicesStats: (stats: any) => void
  setInvoicesLoading: (loading: boolean) => void
  setInvoicesError: (error: string | null) => void
  
  // Cache
  setCache: (key: string, data: any, ttl?: number) => void
  getCache: (key: string) => any | null
  clearCache: (key?: string) => void
  
  // Utilidades
  reset: () => void
}

// Tipo de notificación
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
  autoClose?: boolean
  duration?: number
}

// Estado inicial
const initialState: AppState = {
  config: {
    isConfigured: false,
    environment: 'development',
    version: '1.0.0'
  },
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  },
  ui: {
    sidebarOpen: true,
    theme: 'light',
    loading: false,
    notifications: []
  },
  data: {
    collections: {
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      lastUpdated: null
    },
    suppliers: {
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      lastUpdated: null
    },
    invoices: {
      items: [],
      stats: null,
      isLoading: false,
      error: null,
      lastUpdated: null
    }
  },
  cache: {}
}

/**
 * Store principal de la aplicación
 */
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Configuración
        setConfig: (config) => set((state) => {
          state.config = { ...state.config, ...config }
        }),

        // Autenticación
        setUser: (user) => set((state) => {
          state.auth.user = user
          state.auth.isAuthenticated = !!user
          state.auth.error = null
        }),

        setAuthLoading: (loading) => set((state) => {
          state.auth.isLoading = loading
        }),

        setAuthError: (error) => set((state) => {
          state.auth.error = error
        }),

        // UI
        setSidebarOpen: (open) => set((state) => {
          state.ui.sidebarOpen = open
        }),

        setTheme: (theme) => set((state) => {
          state.ui.theme = theme
        }),

        setLoading: (loading) => set((state) => {
          state.ui.loading = loading
        }),

        addNotification: (notification) => set((state) => {
          state.ui.notifications.push({
            ...notification,
            id: notification.id || Date.now().toString(),
            timestamp: Date.now()
          })
        }),

        removeNotification: (id) => set((state) => {
          state.ui.notifications = state.ui.notifications.filter(n => n.id !== id)
        }),

        clearNotifications: () => set((state) => {
          state.ui.notifications = []
        }),

        // Datos - Collections
        setCollections: (collections) => set((state) => {
          state.data.collections.items = collections
          state.data.collections.lastUpdated = new Date().toISOString()
        }),

        setCollectionsStats: (stats) => set((state) => {
          state.data.collections.stats = stats
        }),

        setCollectionsLoading: (loading) => set((state) => {
          state.data.collections.isLoading = loading
        }),

        setCollectionsError: (error) => set((state) => {
          state.data.collections.error = error
        }),

        // Datos - Suppliers
        setSuppliers: (suppliers) => set((state) => {
          state.data.suppliers.items = suppliers
          state.data.suppliers.lastUpdated = new Date().toISOString()
        }),

        setSuppliersStats: (stats) => set((state) => {
          state.data.suppliers.stats = stats
        }),

        setSuppliersLoading: (loading) => set((state) => {
          state.data.suppliers.isLoading = loading
        }),

        setSuppliersError: (error) => set((state) => {
          state.data.suppliers.error = error
        }),

        // Datos - Invoices
        setInvoices: (invoices) => set((state) => {
          state.data.invoices.items = invoices
          state.data.invoices.lastUpdated = new Date().toISOString()
        }),

        setInvoicesStats: (stats) => set((state) => {
          state.data.invoices.stats = stats
        }),

        setInvoicesLoading: (loading) => set((state) => {
          state.data.invoices.isLoading = loading
        }),

        setInvoicesError: (error) => set((state) => {
          state.data.invoices.error = error
        }),

        // Cache
        setCache: (key, data, ttl = 300000) => set((state) => { // 5 minutos por defecto
          state.cache[key] = {
            data,
            timestamp: Date.now(),
            ttl
          }
        }),

        getCache: (key) => {
          const cache = get().cache[key]
          if (!cache) return null

          // Verificar si el cache ha expirado
          if (Date.now() - cache.timestamp > cache.ttl) {
            set((state) => {
              delete state.cache[key]
            })
            return null
          }

          return cache.data
        },

        clearCache: (key) => set((state) => {
          if (key) {
            delete state.cache[key]
          } else {
            state.cache = {}
          }
        }),

        // Utilidades
        reset: () => set(initialState)
      })),
      {
        name: 'erp-taller-store',
        partialize: (state) => ({
          config: state.config,
          auth: state.auth,
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            theme: state.ui.theme
          }
        })
      }
    ),
    {
      name: 'erp-taller-store'
    }
  )
)

// Selectores útiles
export const useAuth = () => useAppStore((state) => state.auth)
export const useUI = () => useAppStore((state) => state.ui)
export const useCollections = () => useAppStore((state) => state.data.collections)
export const useSuppliers = () => useAppStore((state) => state.data.suppliers)
export const useInvoices = () => useAppStore((state) => state.data.invoices)
export const useConfig = () => useAppStore((state) => state.config)

// Hooks personalizados
export const useNotifications = () => {
  const notifications = useAppStore((state) => state.ui.notifications)
  const addNotification = useAppStore((state) => state.addNotification)
  const removeNotification = useAppStore((state) => state.removeNotification)
  const clearNotifications = useAppStore((state) => state.clearNotifications)

  const showSuccess = (title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      autoClose: true,
      duration: 3000
    })
  }

  const showError = (title: string, message: string) => {
    addNotification({
      type: 'error',
      title,
      message,
      autoClose: true,
      duration: 5000
    })
  }

  const showWarning = (title: string, message: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      autoClose: true,
      duration: 4000
    })
  }

  const showInfo = (title: string, message: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      autoClose: true,
      duration: 3000
    })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}

// Hook para manejo de carga
export const useLoading = () => {
  const loading = useAppStore((state) => state.ui.loading)
  const setLoading = useAppStore((state) => state.setLoading)

  const withLoading = async <T>(operation: () => Promise<T>): Promise<T> => {
    setLoading(true)
    try {
      const result = await operation()
      return result
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    setLoading,
    withLoading
  }
}
