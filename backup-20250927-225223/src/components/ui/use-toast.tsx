"use client"

import { useState } from "react"

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = 'default' }: { 
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { id, title, description, variant }
    
    setToasts(prev => [...prev, newToast])
    
    // Log to console for now
    if (variant === 'destructive') {
      console.error(`[Toast] ${title}: ${description ?? ''}`)
    } else {
      console.log(`[Toast] ${title}: ${description ?? ''}`)
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  return {
    toast,
    toasts
  }
}